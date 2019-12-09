import protocall = require('.');

declare module 'protocall';

interface Handlers {
  [protocolName: string]: Handler
}

interface Handler {
  <T>(value: string): T
  <T>(value: string): Promise<T>
  <T>(value: string, callback: (err: Error | null, result: T) => void): void
}
type UnuseHandler = () => Handler | undefined;
interface FileWithParser {
  path: string;
  parser: (content: string) => Object;
}

declare class Resolver {
  constructor(parent?: Resolver, handlers?: Handlers);
  constructor(handlers: Handlers);

  supportedProtocols: string[];

  protected getProtocol(value: string): string;
  protected getHandlers(protocol: string): Handler[];

  public use(protocols: Handlers) : Record<string, UnuseHandler>;
  public use(protocol: string, handler: Handler) : UnuseHandler;

  private _resolve(data: Object, filename?: string ): Promise<Object>;
  public resolve(data: Object, filename?: string ): Promise<Object>;
  public resolve(data: Object, callback: (err: Error | null, result: Object) => void): void;
  public resolve(data: Object, filename: string, callback: (err: Error | null, result: Object) => void): void;

  public resolveFile(filename: string): Promise<Object>;
  public resolveFile(file: FileWithParser): Promise<Object>;
  public resolveFile(filename: string, callback: (err: Error | null, result: Object) => void): Promise<Object>;
  public resolveFile(file: FileWithParser, callback: (err: Error | null, result: Object) => void): Promise<Object>;
}