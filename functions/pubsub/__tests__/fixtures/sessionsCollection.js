'use-strict';

module.exports = {
  createdAt: 1707592439267,
  isDeleted: false,
  patient: {
    email: 'patient@email.com',
    name: 'PatientName',
  },
  responseRef: '/patient_response/patientid',
  responseRefId: 'patientid',
  sections: [
    {
      chapters: [
        {
          answerId: '123',
          transcript: 'test',
          questionTitle: 'test',
          time: {endTime: 2, startTime: 0},
        },
        {
          answerId: '1234',
          transcript: 'test2',
          questionTitle: 'test2',
          time: {endTime: 4, startTime: 2.5},
        },
        {
          answerId: '12345',
          transcript: 'test3',
          questionTitle: 'test3',
          time: {endTime: 6, startTime: 4.5},
        },
      ],
      mediaUrl: 'https://firebasestorage.path',
      sectionId: 'sectionId',
      sectionName: 'sectionName',
      storageMediaUrlPath: 'https://storage.path',
      subtitle: 'Section Description',
    },
    {
      chapters: [
        {
          answerId: '123',
          transcript: 'test',
          questionTitle: 'test',
          time: {endTime: 2, startTime: 0},
        },
        {
          answerId: '1234',
          transcript: 'test2',
          questionTitle: 'test2',
          time: {endTime: 4, startTime: 2.5},
        },
        {
          answerId: '12345',
          transcript: 'test3',
          questionTitle: 'test3',
          time: {endTime: 6, startTime: 4.5},
        },
      ],
      mediaUrl: 'https://firebasestorage.path',
      sectionId: 'sectionId2',
      sectionName: 'sectionName2',
      storageMediaUrlPath: 'https://storage.path',
      subtitle: 'Section Description2',
    },
  ],
  status: 'New',
  storageThumbnailImagePath: 'https://storage.path',
  thumbnailImage: 'https://firebasestorage.path',
  updatedAt: 1707592439267,
};
