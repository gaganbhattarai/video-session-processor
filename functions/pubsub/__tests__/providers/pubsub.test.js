'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const config = require('../../config');

const FUNCTION_NAME = config.get('firebase.function.name');

/* eslint-disable new-cap */

// Mock required libraries in use
const pubsubMock = {
  PubSub: sinon.stub().returns({
    topic: sinon.stub().returns({
      getMetadata: sinon.stub().resolves([
        {
          schemaSettings: {
            schema: 'testSchema',
            encoding: 'JSON',
          },
        },
      ]),
      publishMessage: sinon.stub().resolves('testMessageId'),
    }),
    schema: sinon.stub().returns({
      get: sinon.stub().resolves({
        definition: 'testSchemaDefinition',
      }),
    }),
  }),
  Encodings: {
    Binary: 'BINARY',
    Json: 'JSON',
  },
  Schema: {
    metadataFromMessage: sinon.stub().returns({
      encoding: 'JSON',
    }),
  },
};

const avroMock = {
  parse: sinon.stub().returns({
    toBuffer: sinon.stub().returns(Buffer.from('testBuffer')),
    toString: sinon.stub().returns('testString'),
    fromBuffer: sinon.stub().returns(Buffer.from('testBufferFrom')),
  }),
};

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
    warn: sinon.stub().returns(Promise.resolve({})),
    error: sinon.stub().returns(Promise.resolve({})),
  }),
};

const pubsubProvider = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../providers/pubsub.js', {
    'avro-js': avroMock,
    '@google-cloud/pubsub': pubsubMock,
    './logging': {
      getLogger: loggerMock.getLogger,
    },
  });

test.before(() => {
  avroMock.parse.resetHistory();
  avroMock.parse().toBuffer.resetHistory();
});

test.afterEach.always(() => {
  loggerMock.getLogger.resetHistory();
  avroMock.parse.resetHistory();
  avroMock.parse().toBuffer.resetHistory();
  pubsubMock.PubSub.resetHistory();

  sinon.resetHistory();
});

test.after(() => {
  sinon.restore();
});

test.serial(
  '"getTopicSchemaMetadata" returns the topic schema metadata object',
  async (t) => {
    const testTopic = 'testTopic';

    const response =
      await pubsubProvider.exportedForTesting.getTopicSchemaMetadata(testTopic);

    t.true(pubsubMock.PubSub.calledOnce);
    t.true(pubsubMock.PubSub().topic.calledOnceWith(testTopic));
    t.true(pubsubMock.PubSub().topic().getMetadata.calledOnce);

    t.deepEqual(
      response,
      (await pubsubMock.PubSub().topic().getMetadata())[0].schemaSettings
    );
  }
);

test.serial(
  '"getTopicSchemaMetadata" raises error if no metadata is found',
  async (t) => {
    const testTopic = 'testTopic';

    const pubsubMockFail = {
      PubSub: sinon.stub().returns({
        topic: sinon.stub().returns({
          getMetadata: sinon.stub().resolves([{}]),
        }),
      }),
    };

    const pubsubProvider = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../../providers/pubsub.js', {
        'avro-js': avroMock,
        '@google-cloud/pubsub': pubsubMockFail,
        './logging': {
          getLogger: loggerMock.getLogger,
        },
      });

    await t.throwsAsync(
      async () =>
        await pubsubProvider.exportedForTesting.getTopicSchemaMetadata(
          testTopic
        ),
      {
        instanceOf: Error,
        message: `Topic ${testTopic} doesn't have a schema.`,
      }
    );
  }
);

test.serial(
  '"getSchemaDefinition" returns the schema definition',
  async (t) => {
    const testSchemaName = 'testSchemaName';

    const response =
      await pubsubProvider.exportedForTesting.getSchemaDefinition(
        testSchemaName
      );

    // t.true(pubsubMock.PubSub.calledOnce);
    t.true(pubsubMock.PubSub().schema.calledOnceWith(testSchemaName));
    t.true(pubsubMock.PubSub().schema().get.calledOnce);

    t.is(response, 'testSchemaDefinition');
  }
);

test.serial(
  '"encodeMessage" encodes message with provided encoding and schema',
  async (t) => {
    const testData = 'testData';
    const testSchemaDef = 'testSchemaDef';
    let testEncoding = 'JSON';

    const jsonResponse = await pubsubProvider.exportedForTesting.encodeMessage(
      testEncoding,
      testSchemaDef,
      testData
    );

    t.true(avroMock.parse.calledOnceWith(testSchemaDef));
    t.true(avroMock.parse().toString.calledOnceWith(testData));

    t.deepEqual(jsonResponse, Buffer.from('testString'));

    testEncoding = 'BINARY';

    const binaryResponse =
      await pubsubProvider.exportedForTesting.encodeMessage(
        testEncoding,
        testSchemaDef,
        testData
      );

    t.true(avroMock.parse().toBuffer.calledOnceWith(testData));
    t.deepEqual(binaryResponse, Buffer.from('testBuffer'));
  }
);

test.serial('"encodeMessage" raises error with invalid encoding', async (t) => {
  const testData = 'testData';
  const testSchemaDef = 'testSchemaDef';
  const testEncoding = 'INVALID';

  const avroMockFail = {
    parse: sinon.stub().returns({
      toBuffer: sinon.stub().returns(null),
    }),
  };

  const pubsubProvider = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../providers/pubsub.js', {
      'avro-js': avroMockFail,
      '@google-cloud/pubsub': pubsubMock,
      './logging': {
        getLogger: loggerMock.getLogger,
      },
    });

  await t.throwsAsync(
    async () =>
      await pubsubProvider.exportedForTesting.encodeMessage(
        testEncoding,
        testSchemaDef,
        testData
      ),
    {
      instanceOf: Error,
      message: `Invalid encoding ${testEncoding}.`,
    }
  );

  // Call the function again to test for logs
  try {
    await pubsubProvider.exportedForTesting.encodeMessage(
      testEncoding,
      testSchemaDef,
      testData
    );
  } catch (err) {
    t.true(
      loggerMock
        .getLogger()
        .error.calledWith(`Invalid encoding ${testEncoding}.`)
    );
    t.true(
      loggerMock
        .getLogger()
        .error.calledWith(`Unknown schema encoding: ${testEncoding}`)
    );
  }
});

test.serial(
  '"decodeMessage" decodes message with provided encoding and schema',
  async (t) => {
    const testData = Buffer.from('{"test": "data"}').toString('base64');
    const testSchemaDef = 'testSchemaDef';
    let testEncoding = 'JSON';

    const jsonResponse = await pubsubProvider.exportedForTesting.decodeMessage(
      testEncoding,
      testSchemaDef,
      testData
    );

    t.true(avroMock.parse.calledOnceWith(testSchemaDef));

    t.deepEqual(jsonResponse, {test: 'data'});

    testEncoding = 'BINARY';

    const binaryResponse =
      await pubsubProvider.exportedForTesting.decodeMessage(
        testEncoding,
        testSchemaDef,
        testData
      );

    t.true(avroMock.parse().fromBuffer.calledOnceWith(testData));
    t.deepEqual(binaryResponse, Buffer.from('testBufferFrom'));
  }
);

test.serial('"decodeMessage" raises error with invalid encoding', async (t) => {
  const testData = 'testData';
  const testSchemaDef = 'testSchemaDef';
  const testEncoding = 'INVALID';

  const avroMockFail = {
    parse: sinon.stub().returns({
      toBuffer: sinon.stub().returns(null),
    }),
  };

  const pubsubProvider = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../providers/pubsub.js', {
      'avro-js': avroMockFail,
      '@google-cloud/pubsub': pubsubMock,
      './logging': {
        getLogger: loggerMock.getLogger,
      },
    });

  await t.throwsAsync(
    async () =>
      await pubsubProvider.exportedForTesting.decodeMessage(
        testEncoding,
        testSchemaDef,
        testData
      ),
    {
      instanceOf: Error,
      message: `Invalid encoding ${testEncoding}.`,
    }
  );

  // Call the function again to test for logs
  try {
    await pubsubProvider.exportedForTesting.decodeMessage(
      testEncoding,
      testSchemaDef,
      testData
    );
  } catch (err) {
    t.true(
      loggerMock
        .getLogger()
        .error.calledWith(`Invalid encoding ${testEncoding}.`)
    );
    t.true(
      loggerMock
        .getLogger()
        .error.calledWith(`Unknown schema encoding: ${testEncoding}`)
    );
  }
});

test.serial(
  '"processMessage" processes the message from a subscribed topic',
  async (t) => {
    const testTopic = 'testTopic';
    const testMessage = {test: 'Message'};
    const testData = {
      data: Buffer.from(JSON.stringify(testMessage)).toString('base64'),
      attributes: {},
    };

    const response = await pubsubProvider.processMessage(testTopic, testData);

    t.true(
      loggerMock
        .getLogger()
        .info.calledOnceWith(
          `Message from topic ${testTopic} processed successfully.`
        )
    );
    t.deepEqual(testMessage, response);
  }
);

test.serial(
  '"publishMessage" publishes the message to a Pub/Sub topic',
  async (t) => {
    const testTopic = 'testTopic';
    const testData = {test: 'Message'};

    const response = await pubsubProvider.publishMessage(testTopic, testData);

    t.true(
      pubsubMock
        .PubSub()
        .topic()
        .publishMessage.calledOnceWith({
          data: Buffer.from('testString'),
          attributes: {origin: FUNCTION_NAME},
        })
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledOnceWith(
          `Message testMessageId published to topic ${testTopic}`
        )
    );
    t.is(response, 'testMessageId');
  }
);

/* eslint-enable new-cap */
