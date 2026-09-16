/**
 * Error envelope returned by the Culqi API.
 * @see https://apidocs.culqi.com/ (Errores)
 */
export interface CulqiApiErrorBody {
  object: "error";
  type?: string;
  charge_id?: string;
  code?: string;
  decline_code?: string;
  merchant_message?: string;
  user_message?: string;
  param?: string;
}

export class CulqiError extends Error {
  readonly status: number;
  readonly type: string | undefined;
  readonly code: string | undefined;
  readonly declineCode: string | undefined;
  readonly param: string | undefined;
  readonly userMessage: string | undefined;
  readonly merchantMessage: string | undefined;
  readonly raw: unknown;

  constructor(status: number, body: Partial<CulqiApiErrorBody>) {
    super(
      body.merchant_message ??
        body.user_message ??
        `Culqi request failed with status ${status}`
    );
    this.name = new.target.name;
    this.status = status;
    this.type = body.type;
    this.code = body.code;
    this.declineCode = body.decline_code;
    this.param = body.param;
    this.userMessage = body.user_message;
    this.merchantMessage = body.merchant_message;
    this.raw = body;
  }
}

/** Invalid or missing API key. */
export class CulqiAuthenticationError extends CulqiError {}

/** Malformed request: bad parameter, missing field, invalid id. */
export class CulqiInvalidRequestError extends CulqiError {}

/** The card was declined or failed processing. */
export class CulqiCardError extends CulqiError {}

/** Rate limiting on the Culqi API. */
export class CulqiRateLimitError extends CulqiError {}

/** Culqi-side failure (5xx or api_error). */
export class CulqiApiError extends CulqiError {}

/** The request never reached Culqi (network failure, abort). */
export class CulqiConnectionError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "CulqiConnectionError";
    this.cause = cause;
  }
}

export function culqiErrorFromResponse(
  status: number,
  body: Partial<CulqiApiErrorBody>
): CulqiError {
  switch (body.type) {
    case "authentication_error":
      return new CulqiAuthenticationError(status, body);
    case "invalid_request_error":
    case "parameter_error":
      return new CulqiInvalidRequestError(status, body);
    case "card_error":
      return new CulqiCardError(status, body);
    case "limit_api_error":
      return new CulqiRateLimitError(status, body);
    case "api_error":
      return new CulqiApiError(status, body);
  }
  if (status === 401 || status === 403) {
    return new CulqiAuthenticationError(status, body);
  }
  if (status === 429) return new CulqiRateLimitError(status, body);
  if (status >= 500) return new CulqiApiError(status, body);
  return new CulqiError(status, body);
}
