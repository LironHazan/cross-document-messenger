module.exports = {
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'jsdom',
  globals: {
    MessageChannel: function () {
      return {
        port1: {
          onmessage: () => {},
          postMessage: () => {},
        },
        port2: {
          onmessage: () => {},
          postMessage: () => {},
        },
      };
    },
  },
};
