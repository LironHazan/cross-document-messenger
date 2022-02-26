export interface Message<T> {
  type: string;
  data: T;
}
export interface ConnectorRetValue<T> {
  emit: (message: Message<T>) => void;
  subscribe: (_handlerFn: (event: Message<T>) => void) => void;
  unsubscribe: () => void;
}

interface MessengerTrait {
  messenger<T>(
    target: HTMLIFrameElement | undefined,
    targetOrigin: string
  ): ConnectorRetValue<T>;
}

function emit<T>(senderPort: MessagePort | undefined, message: Message<T>) {
  senderPort?.postMessage(message);
}

class TargetFrameConnector implements MessengerTrait {
  private _channelRetValue: ConnectorRetValue<any> | undefined;
  private _port: MessagePort | undefined;
  private _listener: ((event: MessageEvent) => void) | undefined;

  /**
   * Responsible for establishing the connection with the host.
   * Returns the following functions:
   * getPort: (): Returns the initialized port used for listening to messages from the host and post messages
   * subscribe: (_handlerFn: (event: Message<T>) => void): Used for subscribing to host messages
   * unsubscribe: (): Should be used by the consumer component unmounting / destruction hook (depends on the framework)
   *
   * Example:
   *      import {TargetFrameMessenger as messenger} from "cross-document-messenger";
   **
   *     // Listen to messages from the host
   *     messenger.subscribe((message: Message<any>) => {
   *          console.log(message);
   *       })
   *
   *     // Emit messages:
   *     messenger.emit({ type: 'foo', data: "clicked inside iframe!"});
   *
   *    // Unsubscribe:
   *    messenger.unsubscribe();
   *
   */
  private _connectToHost<T>(): ConnectorRetValue<T> {
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
      emit: (message: Message<T>) => emit(this?._port, message),
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

  static getInstance(): TargetFrameConnector {
    return new TargetFrameConnector();
  }

  messenger<T>(): ConnectorRetValue<T> {
    if (!this._channelRetValue) {
      this._channelRetValue = this._connectToHost();
    }
    return this._channelRetValue;
  }
}

const connector = TargetFrameConnector.getInstance();
export const TargetFrameMessenger = connector.messenger();

export class HostConnector implements MessengerTrait {
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
  ): ConnectorRetValue<T> {
    this._establishChannel(target, targetOrigin);
    return {
      emit: <T>(message: Message<T>) => {
        emit(this._hostPort, message);
      },
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

  /**
   * Should be consumed by the parent/hosting document
   * Accepts the hosts port which listens to the target messages and an handler to react to the message
   * Example:
   * CrossDocsMessenger.listenToTargetPort(hostPort, (data) => subscribeToChildMessages(data));
   * @param hostPort
   * @param handlerFn
   */

  /**
   * Accepts the intended messaging port (could be either the hosts port or the iframe)
   * and the message,
   * Example:
   * CrossDocsMessenger.emit(hostPort, { type: 'foo', data: { foo: "bar"} });
   * @param senderPort
   * @param message
   */
}
