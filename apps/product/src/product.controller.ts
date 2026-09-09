import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS } from '@app/common';
import { CreateProductDto } from '@app/common';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern(PATTERNS.PRODUCT_CREATE)
  create(@Payload() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @MessagePattern(PATTERNS.PRODUCT_FIND_ALL)
  findAll() {
    return this.productService.findAll();
  }

  @MessagePattern(PATTERNS.PRODUCT_FIND_BY_ID)
  findById(@Payload() data: { id: string }) {
    return this.productService.findById(data.id);
  }

  @MessagePattern(PATTERNS.PRODUCT_UPDATE)
  update(@Payload() data: { id: string; dto: Partial<CreateProductDto> }) {
    return this.productService.update(data.id, data.dto);
  }

  @MessagePattern(PATTERNS.PRODUCT_DELETE)
  remove(@Payload() data: { id: string }) {
    return this.productService.remove(data.id);
  }

  @MessagePattern(PATTERNS.PRODUCT_CHECK_STOCK)
  checkStock(@Payload() data: { productId: string }) {
    return this.productService.checkStock(data.productId);
  }

  @MessagePattern(PATTERNS.PRODUCT_DECREMENT_STOCK)
  decrementStock(@Payload() data: { productId: string; quantity: number }) {
    return this.productService.decrementStock(data.productId, data.quantity);
  }
}