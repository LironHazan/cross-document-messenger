export interface Message<T> {
  type: string;
  data: T;
}

export interface MessagePorts {
  hostPort: MessagePort;
  targetPort: MessagePort;
}

export interface TargetConnectorRetValue<T> {
  emit: (message: Message<T>) => void;
  subscribe: (_handlerFn: (event: Message<T>) => void) => void;
  unsubscribe: () => void;
}

function emit<T>(senderPort: MessagePort | undefined, message: Message<T>) {
  senderPort?.postMessage(message);
}

class TargetFrameConnector {
  private _channelRetValue: TargetConnectorRetValue<any> | undefined;
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
  private static _connectToHost<T>(connector: TargetFrameConnector): TargetConnectorRetValue<T> {
    let handlerFn: (message: Message<T>) => void | undefined;

    const listenerFn = (event: MessageEvent) => {
      if (!connector._port) {
        connector._port = event.ports[0];
        connector._port.onmessage = (event: MessageEvent) => handlerFn(event.data);
      }
    };

    connector._listener = listenerFn;
    window.addEventListener('message', connector._listener);
    return {
      emit: (message: Message<T>) => emit(connector?._port, message),
      subscribe: (_handlerFn: (event: Message<T>) => void) => {
        if (!connector._listener) {
          connector._listener = listenerFn;
        }
        handlerFn = _handlerFn
      },
      unsubscribe: () => {
        connector._listener = undefined;
        window.removeEventListener('message', <(event: MessageEvent) => void><unknown>connector._listener)
      },
    };
  }

  static getInstance(): TargetFrameConnector {
    return new TargetFrameConnector();
  }

  static messenger<T>(
    connector: TargetFrameConnector
  ): TargetConnectorRetValue<T> {
    if (!connector._channelRetValue) {
      connector._channelRetValue = TargetFrameConnector._connectToHost(connector);
    }
    return connector._channelRetValue;
  }
}

const connector = TargetFrameConnector.getInstance();
export const TargetFrameMessenger = TargetFrameConnector.messenger(connector);

export class CrossDocsMessenger {
  /**
   * Should be consumed by the parent/hosting document
   * Accepts the iframe target element and its src url, initialize the MessageChannel and returns
   * the host and targets ports ready for messaging.
   * Example:
   * const { hostPort } = CrossDocsMessenger.connectToChannel(iframeRef, targetOrigin);
   * @param target
   * @param targetOrigin
   */

  static connectToChannel(
    target: HTMLIFrameElement | undefined,
    targetOrigin: string
  ): MessagePorts {
    if (targetOrigin === '*') {
      throw new Error('Unsecured targetOrigin');
    }
    const channel = new MessageChannel();
    target?.contentWindow?.postMessage('connect', targetOrigin, [
      channel?.port2,
    ]);
    return { hostPort: channel.port1, targetPort: channel.port2 };
  }

  /**
   * Should be consumed by the parent/hosting document
   * Accepts the hosts port which listens to the target messages and an handler to react to the message
   * Example:
   * CrossDocsMessenger.listenToTargetPort(hostPort, (data) => subscribeToChildMessages(data));
   * @param hostPort
   * @param handlerFn
   */
  static listenToTargetPort<T>(
    hostPort: MessagePort | undefined,
    handlerFn: (event: Message<T>) => void
  ) {
    // port1 listens to port2 which was transferred to the channel
    if (!hostPort) return;
    if (hostPort) {
      hostPort.onmessage = (event: MessageEvent) => {
        const message: Message<T> = event.data;
        handlerFn(message);
      };
    }
  }

  /**
   * Accepts the intended messaging port (could be either the hosts port or the iframe)
   * and the message,
   * Example:
   * CrossDocsMessenger.emit(hostPort, { type: 'foo', data: { foo: "bar"} });
   * @param senderPort
   * @param message
   */
  static emit<T>(senderPort: MessagePort | undefined, message: Message<T>) {
    emit(senderPort, message);
  }
}
