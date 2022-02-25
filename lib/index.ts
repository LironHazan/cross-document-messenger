export interface Message<T> {
  type: string;
  data: T;
}

export interface MessagePorts {
  hostPort: MessagePort;
  targetPort: MessagePort;
}

export interface TargetConnectorRetValue<T> {
  getPort: () => MessagePort | undefined;
  emit: (senderPort: MessagePort | undefined, message: Message<T>) => void;
  subscribe: (_handlerFn: (event: Message<T>) => void) => void;
  unsubscribe: () => void;
}

function emit<T>(senderPort: MessagePort | undefined, message: Message<T>) {
  senderPort?.postMessage(message);
}

class TargetFrameConnector {
  private channelRetValue: TargetConnectorRetValue<any> | undefined;

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
   *     messenger.emit(messenger.getPort(), { type: 'foo', data: "clicked inside iframe!"});
   *
   *    // Unsubscribe:
   *    messenger.unsubscribe();
   *
   */
  private static connectToHost<T>(): () => TargetConnectorRetValue<T> {
    let port2: MessagePort | undefined;
    let handlerFn: (message: Message<T>) => void | undefined;

    const listenerFn: (event: MessageEvent) => void = (event: MessageEvent) => {
      port2 = event.ports[0];
      port2.onmessage = (event: MessageEvent) => handlerFn(event.data);
    };

    window.addEventListener('message', listenerFn);

    return () => {
      return {
        getPort: () => port2,
        emit: (senderPort: MessagePort | undefined, message: Message<T>) =>
          emit(senderPort, message),
        subscribe: (_handlerFn: (event: Message<T>) => void) =>
          (handlerFn = _handlerFn),
        unsubscribe: () => window.removeEventListener('message', listenerFn),
      };
    };
  }

  static getInstance(): TargetFrameConnector {
    return new TargetFrameConnector();
  }

  static messenger<T>(
    connector: TargetFrameConnector
  ): TargetConnectorRetValue<T> {
    if (!connector.channelRetValue) {
      connector.channelRetValue = TargetFrameConnector.connectToHost()();
    }
    return connector.channelRetValue;
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
