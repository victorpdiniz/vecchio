// Erro de aplicação com status HTTP e mensagem em português já prontos
// para serem devolvidos ao front-end.
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado.') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}
