'use-strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
    warn: sinon.stub().returns(Promise.resolve({})),
    error: sinon.stub().returns(Promise.resolve({})),
  }),
};

const retryMock = {
  sleep: sinon.stub().resolves({}),
};

test.serial(
  'mergeVideo - should merge videos using Google Cloud Transcoder service successfully',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      locationPath: sinon.stub().returns(''),
      createJob: sinon.stub().resolves([{name: 'test/job-id'}]),
      getJob: sinon.stub().resolves([{state: 'SUCCEEDED'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
      './retry': retryMock,
    });

    const result = await transcoderModule.mergeVideo(
      'output-uri',
      [],
      [],
      'output-file'
    );

    t.true(transcoderServiceClientStub.createJob.calledOnce);
    t.is(result, 'SUCCEEDED');
  }
);

test.serial(
  'mergeVideo - should throw an error if there is an issue creating the Transcoder job',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      locationPath: sinon.stub().returns(''),
      createJob: sinon.stub().rejects(new Error('Job creation error')),
      getJob: sinon.stub().resolves([{state: 'SUCCEEDED'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
      './retry': retryMock,
    });

    await t.throwsAsync(
      () => transcoderModule.mergeVideo('output-uri', [], [], 'output-file'),
      {
        instanceOf: Error,
        message: 'Job creation error',
      }
    );
  }
);

test.serial(
  'validateJobStatus - should validate Transcoder job status successfully',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      getJob: sinon.stub().resolves([{state: 'SUCCEEDED'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
      './retry': retryMock,
    });

    const result = await transcoderModule.exportedForTesting.validateJobStatus(
      'job-id'
    );

    t.true(transcoderServiceClientStub.getJob.calledOnce);
    t.is(result, 'SUCCEEDED');
  }
);

test.serial(
  'validateJobStatus - should throw an error if the maximum number of retries is exceeded',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      getJob: sinon
        .stub()
        .onFirstCall()
        .resolves([{state: 'PENDING'}])
        .onSecondCall()
        .resolves([{state: 'RUNNING'}])
        .resolves([{state: 'RUNNING'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
      './retry': retryMock,
    });

    await t.throwsAsync(
      () => transcoderModule.exportedForTesting.validateJobStatus('job-id', 2),
      {
        instanceOf: Error,
        message: 'Exceeded max number of retries for job job-id',
      }
    );
    t.true(transcoderServiceClientStub.getJob.calledThrice);
  }
);

test.serial(
  'validateJobStatus - should throw an error if the unknown status returned',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      getJob: sinon.stub().resolves([{state: 'UNKNOWN'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
      './retry': retryMock,
    });

    await t.throwsAsync(
      () => transcoderModule.exportedForTesting.validateJobStatus('job-id'),
      {
        instanceOf: Error,
        message: 'UNKNOWN',
      }
    );
    t.true(transcoderServiceClientStub.getJob.calledOnce);
  }
);

test.serial(
  'getJobStatus - should get Transcoder job status successfully',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      getJob: sinon.stub().resolves([{state: 'success'}]),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
      './logging': loggerMock,
    });

    const {exportedForTesting} = transcoderModule;
    const {getJobStatus} = exportedForTesting;
    const result = await getJobStatus('job-id');

    t.true(transcoderServiceClientStub.getJob.calledOnce);
    t.is(result, 'success');
  }
);

test.serial(
  'getJobStatus - should throw an error if there is an issue getting the Transcoder job status',
  async (t) => {
    const transcoderServiceClientStub = {
      jobPath: sinon.stub().returns(''),
      getJob: sinon.stub().rejects(new Error('Job status error')),
    };

    const transcoderModule = proxyquire('../../providers/transcoder.js', {
      '@google-cloud/video-transcoder': {
        v1: {
          TranscoderServiceClient: sinon
            .stub()
            .returns(transcoderServiceClientStub),
        },
      },
    });

    await t.throwsAsync(
      () => transcoderModule.exportedForTesting.getJobStatus('job-id'),
      {
        instanceOf: Error,
        message: 'Job status error',
      }
    );
  }
);

const transcoderServiceClientStub = {
  jobPath: sinon.stub().returns(''),
  getJob: sinon.stub().resolves([{state: 'success'}]),
};

const transcoderModule = proxyquire('../../providers/transcoder.js', {
  '@google-cloud/video-transcoder': {
    v1: {
      TranscoderServiceClient: sinon
        .stub()
        .returns(transcoderServiceClientStub),
    },
  },
  './logging': loggerMock,
});

test('"generateInputObjectKey" generates valid response', (t) => {
  let index = 3;

  let inputObjectKeyResponse =
    transcoderModule.exportedForTesting.generateInputObjectKey(index);

  let expectedResponse = 'input4';

  t.is(expectedResponse, inputObjectKeyResponse);

  index = 0;
  inputObjectKeyResponse =
    transcoderModule.exportedForTesting.generateInputObjectKey(index);

  expectedResponse = 'input1';
  t.is(expectedResponse, inputObjectKeyResponse);
});

test('"generateInputObjectKeyList" generates valid response', (t) => {
  const indexList = [1, 2, 3];

  const expectedResponse = ['input2', 'input3', 'input4'];

  const inputObjectKeyResponse =
    transcoderModule.exportedForTesting.generateInputObjectKeyList(indexList);

  t.deepEqual(expectedResponse, inputObjectKeyResponse);
});

test('"generateEditAtomObjectKey" generates valid response', (t) => {
  let index = 3;

  let editAtomObjectKeyResponse =
    transcoderModule.exportedForTesting.generateEditAtomObjectKey(index);

  let expectedResponse = 'atom4';

  t.is(expectedResponse, editAtomObjectKeyResponse);

  index = 0;
  editAtomObjectKeyResponse =
    transcoderModule.exportedForTesting.generateEditAtomObjectKey(index);

  expectedResponse = 'atom1';
  t.is(expectedResponse, editAtomObjectKeyResponse);
});

test('"generateInputObject" generates valid input object', (t) => {
  const index = 2;
  const response = {videoUrl: 'test-url'};
  const expectedResponse = {
    key: 'input3',
    uri: 'test-url',
  };

  const actualResponse =
    transcoderModule.exportedForTesting.generateInputObject(response, index);

  t.deepEqual(expectedResponse, actualResponse);
});

test('"generateInputObjectList" generates valid input object', (t) => {
  const responses = [{videoUrl: 'video-url1'}, {videoUrl: 'video-url2'}];
  const expectedResponse = [
    {
      key: 'input1',
      uri: 'video-url1',
    },
    {
      key: 'input2',
      uri: 'video-url2',
    },
  ];

  const actualResponse =
    transcoderModule.exportedForTesting.generateInputObjectList(responses);

  t.deepEqual(expectedResponse, actualResponse);
});

test('"generateEditAtomObject" generates valid input object', (t) => {
  const index = 2;
  const inputList = ['input3'];

  const expectedResponse = {
    key: 'atom3',
    inputs: inputList,
  };

  const actualResponse =
    transcoderModule.exportedForTesting.generateEditAtomObject(
      index,
      inputList
    );

  t.deepEqual(expectedResponse, actualResponse);

  const actualResponse2 =
    transcoderModule.exportedForTesting.generateEditAtomObject(
      index,
      inputList,
      'startTime',
      'endTime'
    );

  t.deepEqual(
    {
      ...expectedResponse,
      startTimeOffset: 'startTime',
      endTimeOffset: 'endTime',
    },
    actualResponse2
  );
});

test('"generateEditAtomObjectList" generates valid input object', (t) => {
  const responses = [{videoUrl: 'video-url1'}, {videoUrl: 'video-url2'}];

  const expectedResponse = [
    {
      key: 'atom1',
      inputs: ['input1'],
    },
    {
      key: 'atom2',
      inputs: ['input2'],
    },
  ];

  const actualResponse =
    transcoderModule.exportedForTesting.generateEditAtomObjectList(responses);

  t.deepEqual(expectedResponse, actualResponse);
});

// TODO
test('"generateTranscoderRequestObject" generates valid input object', (t) => {});
