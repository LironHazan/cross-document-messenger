[![npm version](https://d25lcipzij17d.cloudfront.net/badge.svg?id=js&type=6&v=1.0.5&x2=0)](https://www.npmjs.com/package/cross-document-messenger)

## cross-document-messenger

Zero dependencies library for enabling friendly cross document web messaging on top of the MessageChannel API.


WIP 


API:

Hosting application:

- HostConnector
  - ```getInstance(): HostConnector ```
  - ```messenger<T>(target: HTMLIFrameElement | undefined, targetOrigin: string): ConnectorRetValue<T>;```

How to use:
- Get the `HostConnector` instance statically by calling `HostConnector.getInstance()` or use the new keyword.
- Init the messaging facade by invoking the `messenger(...)` method, passing required iframe params.
- Start using the messenger API:
  - push messages to the iframe by: `messenger.emit(...)`
  - register messages from the iframe by: `messenger.subscribe((m) => {...})`
  - reset the connector by: `messenger.unsubscribe()`

Examples:

Recommended Angular way:

1. Create a proxy service around HostConnector to be injected using Angular DI.

```typescript

export class CrossDocumentMessengerService {

  private readonly _connector: HostConnector;
  get connector(): HostConnector {
    return this._connector;
  }

  public messenger(target: HTMLIFrameElement | undefined, targetOrigin: string): ConnectorRetValue<any> {
    return this._connector.messenger(target, targetOrigin);
  }
  
  constructor() {
    this._connector = HostConnector?.getInstance();
  }
}

```

2. Setup the target wrapper component to consume the instance of the service (you may have more than one iframe 
integrated into your app)

```typescript
@Component({
  selector: 'app-wrapper',
  template: ` <div class="wrapper">
    <iframe #ref id="embedded-app" width="100%" height="100%" [src]="safeUrl" (load)="onLoad()"></iframe>
  </div>`,
  styleUrls: ['./wrapper.component.scss'],
  providers: [CrossDocumentMessengerService]
})

....

private messenger: ConnectorRetValue<any>;

constructor(private cdms: CrossDocumentMessengerService) {}

onLoad() {
    if (this.iframe?.nativeElement) {
        const targetOrigin = 'http://localhost:3000';
        this.messenger = this.cdms?.messenger(this.iframe?.nativeElement, targetOrigin);
        this.messenger?.subscribe((data) => this.subscribeToChildMessages(data));
        this.messenger.emit({ type: 'connected', data: 'initiated' });
    }
}


```
