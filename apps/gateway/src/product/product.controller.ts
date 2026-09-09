import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PATTERNS } from '@app/common';
import { CreateProductDto } from '@app/common';


@Controller('products')
export class ProductController {
  constructor(
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return firstValueFrom(
      this.productClient.send(PATTERNS.PRODUCT_CREATE, dto),
    );
  }

  @Get()
  findAll() {
    return firstValueFrom(
      this.productClient.send(PATTERNS.PRODUCT_FIND_ALL, {}),
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return firstValueFrom(
      this.productClient.send(PATTERNS.PRODUCT_FIND_BY_ID, { id }),
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return firstValueFrom(
      this.productClient.send(PATTERNS.PRODUCT_UPDATE, { id, ...dto }),
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return firstValueFrom(
      this.productClient.send(PATTERNS.PRODUCT_DELETE, { id }),
    );
  }
}