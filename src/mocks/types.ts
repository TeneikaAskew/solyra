/** Shared shapes for the mock-mode route table (see src/mocks/index.ts). */

export interface MockRequest {
  method: string;
  url: URL;
  /** Parsed JSON body when present and parseable, else undefined. */
  body: unknown;
}

export interface MockReply {
  status?: number;
  /** JSON body (serialized with contentType application/json). */
  body?: unknown;
  /** Raw text body (e.g. markdown reports); wins over `body`. */
  text?: string;
  contentType?: string;
}

export interface MockRoute {
  /** Uppercase HTTP method; defaults to GET. */
  method?: string;
  /** Tested against the URL pathname only; query is on `req.url`. */
  pattern: RegExp;
  reply: (req: MockRequest, match: RegExpMatchArray) => MockReply;
}
