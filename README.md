[![npm version](https://d25lcipzij17d.cloudfront.net/badge.svg?id=js&type=6&v=1.0.6&x2=0)](https://www.npmjs.com/package/cross-document-messenger)

## cross-document-messenger

Lightweight (zero dependencies) library for enabling cross document web messaging on top of the MessageChannel API.


### API:

The API includes two connectors, one for the host app (`HostConnector`) and another for the hosted app loaded from the iframe (`TargetFrameConnector`).

Both connectors when initialized expose the `CrossDocMessenger<T>` friendly api (emit, subscribe, unsubscribe) to be used by your application.

#### The Hosting application:

- HostConnector
  - ```getInstance(): HostConnector ```
  - ```messenger<T>(target: HTMLIFrameElement | undefined, targetOrigin: string): CrossDocMessenger<T>;```

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
@Injectable({ providedIn: 'any' })
export class CrossDocumentMessengerService<T> {

  private readonly _connector: HostConnector;
  get connector(): HostConnector {
    return this._connector;
  }

  public messenger(target: HTMLIFrameElement | undefined, targetOrigin: string): CrossDocMessenger<T> {
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

private messenger: CrossDocMessenger<any>;

constructor(private cdms: CrossDocumentMessengerService<T>) {}

onLoad() {
    if (this.iframe?.nativeElement) {
        const targetOrigin = 'http://localhost:3000';
        this.messenger = this.cdms?.messenger(this.iframe?.nativeElement, targetOrigin);
        this.messenger?.subscribe((data) => this.subscribeToChildMessages(data));
        this.messenger.emit({ type: 'connected', data: 'initiated' });
    }
}


```


#### The Hosted application:

- `TargetFrameMessenger` - import `TargetFrameMessenger` to get the `CrossDocMessenger<T>` functionalities over
the initialized `TargetFrameConnector` instance.


- Start using the messenger API:
  - Emit messages to the host by: `messenger.emit(...)`
  - Subscribe to the host's messages by: `messenger.subscribe((m) => {...})`
  - Detach the native event listener and clear the connector state by: `messenger.unsubscribe()`

Examples:

Hosted React application:

Subscribing to host's messages on component mount and unsubscribing when unmount 


```javascript 
import { TargetFrameMessenger as messenger, Message} from "cross-document-messenger";

export const Tabs: React.FC = () => {
  
useEffect(() => {
        messenger.subscribe((e: Message<any>) => {
        })
        return () => {
          messenger.unsubscribe();
        }
    }, [])
    
    .....
    
  const handleClick = () => {
        messenger.emit({ type: 'open_foo_dialog', data: "clicked inside the iframe will trigger the host to open a dialog"});
      }
```
