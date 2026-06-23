// Excepcion base de la que heredan todas las demas (ver skill backend-architecture).
// El middleware errorHandler la mapea a la respuesta uniforme { error, error_code,
// details } con su status_code.
export class FenrirException extends Error {
  constructor(
    public readonly error: string,
    public readonly error_code: string,
    public readonly status_code: number,
    public readonly details?: unknown,
  ) {
    super(error);
    this.name = new.target.name;
  }
}
