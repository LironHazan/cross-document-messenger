export interface Message<T> {
  type: string;
  data: T;
}
export interface CrossDocMessenger<T> {
  emit: (message: Message<T>) => void;
  subscribe: (_handlerFn: (event: Message<T>) => void) => void;
  unsubscribe: () => void;
}
interface MessengerConstraint {
  messenger<T>(
    target: HTMLIFrameElement | undefined,
    targetOrigin: string
  ): CrossDocMessenger<T>;
}

/**
 * Target/Hosted document (iframe) API
 */
class TargetFrameConnector implements MessengerConstraint {
  private _crossDocMessenger: CrossDocMessenger<any> | undefined;
  private _port: MessagePort | undefined;
  private _listener: ((event: MessageEvent) => void) | undefined;

  static getInstance(): TargetFrameConnector {
    return new TargetFrameConnector();
  }

  private _connectToHost<T>(): CrossDocMessenger<T> {
    let handlerFn: (message: Message<T>) => void | undefined;

    const listenerFn = (event: MessageEvent) => {
      if (!this._port && event.ports.length > 0) {
        this._port = event.ports[0];
        this._port.onmessage = (event: MessageEvent) => handlerFn(event.data);
      }
    };

    this._listener = listenerFn;
    window.addEventListener('message', this._listener);
    return {
      emit: (message: Message<T>) => this?._port?.postMessage(message),
      subscribe: (_handlerFn: (event: Message<T>) => void) => {
        if (!this._listener) {
          this._listener = listenerFn;
        }
        handlerFn = _handlerFn;
      },
      unsubscribe: () => {
        this._listener = undefined;
        window.removeEventListener(
          'message',
          <(event: MessageEvent) => void>(<unknown>this._listener)
        );
      },
    };
  }

  messenger<T>(): CrossDocMessenger<T> {
    if (!this._crossDocMessenger) {
      this._crossDocMessenger = this._connectToHost();
    }
    return this._crossDocMessenger;
  }
}
const connector = TargetFrameConnector.getInstance();
/**
 * TargetFrameMessenger is of type: CrossDocMessenger<T>
 */
export const TargetFrameMessenger = connector.messenger();

/**
 * Host document API
 */
export class HostConnector implements MessengerConstraint {
  private _hostPort: MessagePort | undefined;
  private _channel: MessageChannel | undefined;

  static getInstance() {
    return new HostConnector();
  }

  /**
   * Should be consumed by the parent/hosting document
   * Accepts the iframe target element and its src url, initialize the MessageChannel and returns
   * the host and targets ports ready for messaging.
   * Example:
   * const { hostPort } = CrossDocsMessenger.connectToChannel(iframeRef, targetOrigin);
   * @param target
   * @param targetOrigin
   */
  private _establishChannel(
    target: HTMLIFrameElement | undefined,
    targetOrigin: string
  ) {
    if (targetOrigin === '*') {
      throw new Error('Unsecured targetOrigin');
    }
    this._channel = new MessageChannel();
    this._hostPort = this._channel.port1;
    target?.contentWindow?.postMessage('connect', targetOrigin, [
      this._channel?.port2,
    ]);
  }

  public messenger<T>(
    target: HTMLIFrameElement | undefined,
    targetOrigin: string
  ): CrossDocMessenger<T> {
    this._establishChannel(target, targetOrigin);
    return {
      emit: <T>(message: Message<T>) => this._hostPort?.postMessage(message),
      subscribe: <T>(handlerFn: (event: Message<T>) => void) => {
        // port1 listens to port2 which was transferred to the channel
        if (!this._hostPort) return;
        if (this._hostPort) {
          this._hostPort.onmessage = (event: MessageEvent) => {
            const message: Message<T> = event.data;
            handlerFn(message);
          };
        }
      },
      unsubscribe: () => {
        this._channel = undefined;
      },
    };
  }
}
