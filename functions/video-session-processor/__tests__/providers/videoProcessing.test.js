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

test.serial(
  'getMediaDuration - should return the duration of the multimedia file',
  async (t) => {
    const createReadStreamStub = sinon.stub().returns('fake-readable-stream');

    const ffmpegStub = sinon.stub().returns({
      ffprobe: sinon.stub().callsArgWith(0, null, {format: {duration: 10}}),
    });

    const {getMediaDuration} = proxyquire(
      '../../providers/videoProcessing.js',
      {
        'fluent-ffmpeg': ffmpegStub,
        './logging.js': loggerMock,
      }
    );

    const result = await getMediaDuration({
      createReadStream: createReadStreamStub,
    });

    t.true(createReadStreamStub.calledOnce);
    t.true(ffmpegStub.calledOnce);
    t.true(ffmpegStub().ffprobe.calledOnce);
    t.is(result, 10);
  }
);

test.serial(
  'getMediaDuration - should throw an error if ffprobe execution fails',
  async (t) => {
    const createReadStreamStub = sinon.stub().returns('fake-readable-stream');

    const ffmpegStub = sinon.stub().returns({
      ffprobe: sinon.stub().callsArgWith(0, new Error('FFprobe error')),
    });

    const {getMediaDuration} = proxyquire(
      '../../providers/videoProcessing.js',
      {
        'fluent-ffmpeg': ffmpegStub,
        './logging.js': loggerMock,
      }
    );

    await t.throwsAsync(
      () => getMediaDuration({createReadStream: createReadStreamStub}),
      {
        instanceOf: Error,
        message: 'FFprobe error',
      }
    );
  }
);

// test.serial(
//   'generateThumbnailImages - should generate thumbnail imfages successfully',
//   async (t) => {
//     // Arrange
//     const onFilenamesSpy = sinon.spy();
//     const onEndSpy = sinon.spy();
//     const onErrorSpy = sinon.spy();

//     const ffmpegStub = sinon.stub().returns({
//       on: sinon.stub().returns({
//         on: sinon.stub().returns({
//           on: sinon.stub().returns({
//             screenshots: sinon.stub(),
//           }),
//         }),
//       }),
//     });
//     // screenshots: sinon.stub().callsFake((options) => {
//     //   t.is(options.count, 1);
//     //   t.is(options.folder, '/path/to/thumbnails');
//     //   t.is(options.filename, 'thumbnail.jpg');
//     // }),
//     // });

//     const {generateThumbnailImages} = proxyquire(
//       '../../providers/videoProcessing.js',
//       {
//         'fluent-ffmpeg': ffmpegStub,
//       }
//     );

//     await generateThumbnailImages(
//       '/path/to/media.mp4',
//       '/path/to/thumbnails/thumbnail.jpg'
//     );

//     t.true(ffmpegStub.calledOnce);
//     t.true(onFilenamesSpy.calledOnce);
//     t.true(onEndSpy.calledOnce);
//     t.false(onErrorSpy.called); // Ensure 'onError' is not called
//     // t.true(screenshotsStub.calledOnce);
//   }
// );

// test.serial(
//   'generateThumbnailImages - should generate thumbnail images successfully',
//   async (t) => {
//     const ffmpegStub = sinon.stub().returns({
//       on: sinon.stub().callsFake((eventName, callback) => {
//         // Assuming eventName is 'end' or any other event you want to simulate
//         if (eventName === 'end') {
//           callback();
//         }
//       }),
//       screenshots: sinon.stub().callsFake((options) => {
//         // Assertions for the options passed to screenshots
//         t.is(options.count, 1);
//         t.is(options.folder, '/path/to/thumbnails');
//         t.is(options.filename, 'thumbnail.jpg');
//       }),
//     });

//     const {generateThumbnailImages} = proxyquire(
//       '../../providers/videoProcessing.js',
//       {
//         'fluent-ffmpeg': ffmpegStub,
//         './logging.js': loggerMock,
//       }
//     );

//     await generateThumbnailImages(
//       '/path/to/media.mp4',
//       '/path/to/thumbnails/thumbnail.jpg'
//     );

//     t.true(ffmpegStub.calledOnce);
//   }
// );

// test.serial(
//   'generateThumbnailImages - should throw an error if there is an issue generating thumbnails',
//   async (t) => {
//     // Arrange
//     const ffmpegStub = sinon.stub().returns({
//       on: () => {},
//       screenshots: sinon.stub().callsFake(() => {
//         throw new Error('Thumbnail generation error');
//       }),
//     });

//     const {generateThumbnailImages} = proxyquire(
//       '../../providers/videoProcessing.js',
//       {
//         'fluent-ffmpeg': ffmpegStub,
//         './logging.js': loggerMock,
//       }
//     );

//     // Act and Assert
//     await t.throwsAsync(
//       () =>
//         generateThumbnailImages(
//           '/path/to/media.mp4',
//           '/path/to/thumbnails/thumbnail.jpg'
//         ),
//       {
//         instanceOf: Error,
//         message: 'Thumbnail generation error',
//       }
//     );
//   }
// );
