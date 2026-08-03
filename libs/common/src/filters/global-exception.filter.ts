import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // NestJS HTTP Exceptions (BadRequestException, ValidationPipe errors, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message;
      error = (res as any).error || exception.message;
    }

    // RPC Exceptions coming back from microservices (Auth/Product/Order)
    // Shape thrown on the microservice side: throw new RpcException({ statusCode, message })
    else if (
      exception &&
      typeof exception === 'object' &&
      'statusCode' in (exception as any)
    ) {
      const rpcError = exception as any;
      status = rpcError.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = rpcError.message ?? 'Internal server error';
      error = rpcError.error || this.mapStatusToError(status);
    }

    // Timeout errors from ClientProxy.send() (e.g. microservice unreachable)
    else if (
      exception &&
      typeof exception === 'object' &&
      (exception as any).message === 'Empty response'
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Service Unavailable';
      message = 'The requested service is currently unavailable';
    }

    // Unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${request.method}] ${request.url} - ${status}: ${JSON.stringify(message)}`,
    );

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapStatusToError(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return map[status] || 'Error';
  }
}