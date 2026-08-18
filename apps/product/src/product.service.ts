import { Injectable, Inject } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from './database/database.module';
import type { DrizzleDB } from './database/database.module';
import { products } from './database/products.schema';
import { CreateProductDto } from '@app/common';

@Injectable()
export class ProductService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}




async create(dto: CreateProductDto) {
  const normalizedSku = dto.sku.trim().toUpperCase();
  const normalizedName = dto.name.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(dto.price.toString())) {
    throw new RpcException({
      status: 400,
      message: 'Price must have at most 2 decimal places',
    });
  }

  if (
    dto.lowStockThreshold !== undefined &&
    dto.lowStockThreshold >= dto.stock
  ) {
    throw new RpcException({
      status: 400,
      message: 'lowStockThreshold must be less than initial stock',
    });
  }

  const [existing] = await this.db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, normalizedSku));

  if (existing) {
    throw new RpcException({
      status: 409,
      message: `Product with SKU "${normalizedSku}" already exists`,
    });
  }

  const [product] = await this.db
    .insert(products)
    .values({
      ...dto,
      sku: normalizedSku,
      name: normalizedName,
      price: dto.price.toString(),
    })
    .returning();

  return product;
}

async findAll() {
  return this.db.select().from(products);
}


async update(id: string, dto: Partial<CreateProductDto>) {
  const updateData: Record<string, any> = { ...dto, updatedAt: new Date() };

  if (dto.price !== undefined) {
    if (!/^\d+(\.\d{1,2})?$/.test(dto.price.toString())) {
      throw new RpcException({
        status: 400,
        message: 'Price must have at most 2 decimal places',
      });
    }
    updateData.price = dto.price.toString();
  }

  // SKU normalization + duplicate check (باستثناء نفس المنتج)
  if (dto.sku !== undefined) {
    const normalizedSku = dto.sku.trim().toUpperCase();

    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, normalizedSku));

    if (existing && existing.id !== id) {
      throw new RpcException({
        status: 409,
        message: `Product with SKU "${normalizedSku}" already exists`,
      });
    }
    updateData.sku = normalizedSku;
  }

  if (dto.name !== undefined) {
    updateData.name = dto.name.trim();
  }

  // lowStockThreshold vs stock consistency
  if (dto.lowStockThreshold !== undefined || dto.stock !== undefined) {
    const [current] = await this.db
      .select({ stock: products.stock, lowStockThreshold: products.lowStockThreshold })
      .from(products)
      .where(eq(products.id, id));

    if (!current) {
      throw new RpcException({ status: 404, message: 'Product not found' });
    }

    const finalStock = dto.stock ?? current.stock;
    const finalThreshold = dto.lowStockThreshold ?? current.lowStockThreshold;

    if (finalThreshold >= finalStock) {
      throw new RpcException({
        status: 400,
        message: 'lowStockThreshold must be less than stock',
      });
    }
  }

  const [product] = await this.db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();

  if (!product) {
    throw new RpcException({ status: 404, message: 'Product not found' });
  }
  return product;
}

async remove(id: string) {
  const [product] = await this.db
    .delete(products)
    .where(eq(products.id, id))
    .returning();

  if (!product) {
    throw new RpcException({ status: 404, message: 'Product not found' });
  }
  return { deleted: true, id: product.id };
}

  async findById(id: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) {
      throw new RpcException({ status: 404, message: 'Product not found' });
    }
    return product;
  }

  async checkStock(productId: string) {
    const [product] = await this.db
      .select({ id: products.id, stock: products.stock })
      .from(products)
      .where(eq(products.id, productId));

    if (!product) {
      throw new RpcException({ status: 404, message: 'Product not found' });
    }
    return product;
  }

  // atomic conditional decrement — prevent overselling

  async decrementStock(productId: string, quantity: number) {
    const [updated] = await this.db
      .update(products)
      .set({
        stock: sql`${products.stock} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        sql`${products.id} = ${productId} AND ${products.stock} >= ${quantity}`,
      )
      .returning();

    if (!updated) {
      const [existing] = await this.db
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .where(eq(products.id, productId));

      if (!existing) {
        throw new RpcException({ status: 404, message: 'Product not found' });
      }
      throw new RpcException({
        status: 409,
        message: `Insufficient stock. Available: ${existing.stock}`,
      });
    }

    return updated;
  }
}
