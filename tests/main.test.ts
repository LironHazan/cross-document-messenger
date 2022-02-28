import {
  __target_connector_instance,
  HostConnector,
  TargetFrameMessenger,
} from '../lib';

const targetOriginSrc = 'http://foobar.com';

test('test TargetFrameMessenger returns valid API', () => {
  const { emit, subscribe, unsubscribe } = TargetFrameMessenger;
  expect(emit).toBeTruthy();
  expect(subscribe).toBeTruthy();
  expect(unsubscribe).toBeTruthy();
});

test('reflections', () => {
  expect(typeof __target_connector_instance.messenger).toBe('function');
  const { emit, subscribe, unsubscribe } =
    __target_connector_instance.messenger();
  expect(typeof emit).toBe('function');
  expect(typeof subscribe).toBe('function');
  expect(typeof unsubscribe).toBe('function');
});

test('Throw error when passing "any" origin matched to "*"', () => {
  const hostConnector = HostConnector.getInstance();
  try {
    hostConnector.messenger(undefined, '*');
  } catch (e) {
    expect((e as Error).message).toBe('Unsecured targetOrigin');
  }
});

test('Dont panic when iframe isnt loaded', () => {
  const hostConnector = HostConnector.getInstance();
  const msngr = hostConnector.messenger(undefined, targetOriginSrc);
  expect(msngr).toBeFalsy();
});

test('construct messenger', () => {
  const hostConnector = HostConnector.getInstance();

  const frame = window.document.createElement('iframe');
  window.document.body.appendChild(frame);
  frame.src = targetOriginSrc;

  const msngr = hostConnector.messenger(frame, targetOriginSrc);
  expect(msngr).toBeTruthy();

  // Don't fail on emit
  msngr?.emit({ type: 'foo', data: 'bar' });
});
