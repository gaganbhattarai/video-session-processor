'use-strict';

module.exports = {
  request: {
    body: {
      event_id: '1234-56e',
      event_type: 'test_type',
      interaction_id: '1234-56i',
      contact: {
        contact_id: '1234-56c',
        organization_id: '1234-56o',
        respondent_id: '1234-56r',
        name: 'Demo 2',
        email: 'demo2@gmail.com',
        phone_number: null,
        thumbnail: 'https://medialink.com/thumbnails/image.0000002.jpg',
        status: 'completed',
        created_at: '2023-11-09T08:17:59.920563Z',
        updated_at: '2023-11-09T08:19:33.856075Z',
        answers: [
          {
            answer_id: '1234-56aa',
            question_id: '1234-56q',
            media_id: '1234-56q',
            media_url: 'https://medialink.com/video.mp4',
            media_duration: 10,
            questionTitle: 'What brings you to see us?',
            questionLabel: '1 What brings you to see...',
            type: 'video',
            transcription:
              "Maybe I'll just go back and take a look at that again because I think it probably would be helpful.",
            transcription_data: [
              {
                words: [
                  {
                    word: 'Maybe',
                    end_time: 0.9,
                    start_time: 0.7,
                  },
                  {
                    word: "I'll",
                    end_time: 1.2,
                    start_time: 0.9,
                  },
                  {
                    word: 'just',
                    end_time: 1.4,
                    start_time: 1.2,
                  },
                  {
                    word: 'go',
                    end_time: 1.6,
                    start_time: 1.4,
                  },
                  {
                    word: 'back',
                    end_time: 1.8,
                    start_time: 1.6,
                  },
                  {
                    word: 'and',
                    end_time: 2.2,
                    start_time: 1.8,
                  },
                  {
                    word: 'take',
                    end_time: 2.4,
                    start_time: 2.2,
                  },
                  {
                    word: 'a',
                    end_time: 2.6,
                    start_time: 2.5,
                  },
                  {
                    word: 'look',
                    end_time: 2.7,
                    start_time: 2.6,
                  },
                  {
                    word: 'at',
                    end_time: 2.8,
                    start_time: 2.7,
                  },
                  {
                    word: 'that',
                    end_time: 2.9,
                    start_time: 2.8,
                  },
                  {
                    word: 'again',
                    end_time: 3.1,
                    start_time: 2.9,
                  },
                  {
                    word: 'because',
                    end_time: 3.3,
                    start_time: 3.2,
                  },
                  {
                    word: 'I',
                    end_time: 3.5,
                    start_time: 3.3,
                  },
                  {
                    word: 'think',
                    end_time: 3.6,
                    start_time: 3.5,
                  },
                  {
                    word: 'it',
                    end_time: 3.9,
                    start_time: 3.7,
                  },
                  {
                    word: 'probably',
                    end_time: 4.1,
                    start_time: 3.9,
                  },
                  {
                    word: 'would',
                    end_time: 4.4,
                    start_time: 4.2,
                  },
                  {
                    word: 'be',
                    end_time: 4.5,
                    start_time: 4.4,
                  },
                  {
                    word: 'helpful.',
                    end_time: 5.1,
                    start_time: 4.5,
                  },
                ],
                confidence: 0.946322482678985,
                transcript:
                  "Maybe I'll just go back and take a look at that again because I think it probably would be helpful.",
              },
            ],
            created_at: '2023-11-09T08:17:59.920563Z',
          },
          {
            answer_id: '1234-56ab',
            question_id: '1234-56qb',
            media_url: 'https://media.link/video2.mp4',

            questionTitle: 'Tell us more',
            questionLabel: '2 Tell us more about your...',
            type: 'video',
            transcription:
              'Mary, a 42 year old woman, was referred by her primary care physician because of depression beginning at age 24 and a number of other problems.',
            transcription_data: [
              {
                words: [
                  {
                    word: 'Mary,',
                    end_time: 4.6,
                    start_time: 4,
                  },
                  {
                    word: 'a',
                    end_time: 5.1,
                    start_time: 4.8,
                  },
                  {
                    word: '42',
                    end_time: 5.7,
                    start_time: 5.1,
                  },
                  {
                    word: 'year',
                    end_time: 5.9,
                    start_time: 5.8,
                  },
                  {
                    word: 'old',
                    end_time: 6.2,
                    start_time: 5.9,
                  },
                  {
                    word: 'woman,',
                    end_time: 6.9,
                    start_time: 6.3,
                  },
                  {
                    word: 'was',
                    end_time: 7.4,
                    start_time: 7,
                  },
                  {
                    word: 'referred',
                    end_time: 7.9,
                    start_time: 7.4,
                  },
                  {
                    word: 'by',
                    end_time: 8.1,
                    start_time: 7.9,
                  },
                  {
                    word: 'her',
                    end_time: 8.4,
                    start_time: 8.2,
                  },
                  {
                    word: 'primary',
                    end_time: 8.9,
                    start_time: 8.4,
                  },
                  {
                    word: 'care',
                    end_time: 9.2,
                    start_time: 8.9,
                  },
                  {
                    word: 'physician',
                    end_time: 10.2,
                    start_time: 9.3,
                  },
                  {
                    word: 'because',
                    end_time: 10.8,
                    start_time: 10.3,
                  },
                  {
                    word: 'of',
                    end_time: 11.1,
                    start_time: 10.8,
                  },
                  {
                    word: 'depression',
                    end_time: 12.1,
                    start_time: 11.1,
                  },
                  {
                    word: 'beginning',
                    end_time: 12.8,
                    start_time: 12.3,
                  },
                  {
                    word: 'at',
                    end_time: 13,
                    start_time: 12.9,
                  },
                  {
                    word: 'age',
                    end_time: 13.3,
                    start_time: 13.1,
                  },
                  {
                    word: '24',
                    end_time: 14.3,
                    start_time: 13.4,
                  },
                  {
                    word: 'and',
                    end_time: 14.7,
                    start_time: 14.5,
                  },
                  {
                    word: 'a',
                    end_time: 14.9,
                    start_time: 14.7,
                  },
                  {
                    word: 'number',
                    end_time: 15.1,
                    start_time: 14.9,
                  },
                  {
                    word: 'of',
                    end_time: 15.3,
                    start_time: 15.1,
                  },
                  {
                    word: 'other',
                    end_time: 15.5,
                    start_time: 15.3,
                  },
                  {
                    word: 'problems.',
                    end_time: 16.2,
                    start_time: 15.6,
                  },
                ],
                confidence: 0.940240830618894,
                transcript:
                  'Mary, a 42 year old woman, was referred by her primary care physician because of depression beginning at age 24 and a number of other problems.',
              },
            ],
          },
        ],
        platform: 'desktop',
        tags: [],
        variables: {
          section_id: 'section_id1',
          contact_user_id: 'contact_user_id1',
          section_name: 'High times',
          series_id: 'series_id1',
          next_section_id: 'next_section_id1',
          subtitle: 'Discuss concentration, impulsivity, and energy issues',
        },
      },
      form: {
        form_id: '1234-567f',
        author_id: '1234-56ai',
        organization_id: '1234-56oi',
        status: 'published',
        title: 'Test series',
        questions: [
          {
            form_id: '1234-567f',
            gif: 'https://media/thumbnails/preview.gif',
            label: '1 Can you tell me about... (transcribed)',
            media_id: '1234-56mi',
            media_duration: 7,
            media_type: 'video',
            media_url: 'https://media/video3.mp4',
            question_id: '1234-56q',
            share_id: 'share_id1',
            share_url: 'https://www.videoask.com/share_id1',
            thumbnail: 'https://media/1234-56mi/thumbnails/image.0000002.jpg',
            transcode_status: 'completed',
            transcribe_status: 'completed',
            transcription:
              'Can you tell me about what brought you to this visit today?',
            transcription_data: [
              {
                words: [
                  {
                    word: 'Can',
                    end_time: 1.2,
                    start_time: 1.1,
                  },
                  {
                    word: 'you',
                    end_time: 1.3,
                    start_time: 1.2,
                  },
                  {
                    word: 'tell',
                    end_time: 1.5,
                    start_time: 1.3,
                  },
                  {
                    word: 'me',
                    end_time: 1.8,
                    start_time: 1.6,
                  },
                  {
                    word: 'about',
                    end_time: 2,
                    start_time: 1.8,
                  },
                  {
                    word: 'what',
                    end_time: 2.3,
                    start_time: 2.1,
                  },
                  {
                    word: 'brought',
                    end_time: 2.6,
                    start_time: 2.3,
                  },
                  {
                    word: 'you',
                    end_time: 2.8,
                    start_time: 2.6,
                  },
                  {
                    word: 'to',
                    end_time: 2.9,
                    start_time: 2.8,
                  },
                  {
                    word: 'this',
                    end_time: 3.1,
                    start_time: 2.9,
                  },
                  {
                    word: 'visit',
                    end_time: 3.5,
                    start_time: 3.2,
                  },
                  {
                    word: 'today?',
                    end_time: 3.7,
                    start_time: 3.6,
                  },
                ],
                confidence: 0.9977874999999999,
                transcript:
                  'Can you tell me about what brought you to this visit today?',
              },
            ],
            type: 'standard',
            updated_at: '2023-09-06T10:29:12.740809Z',
            created_at: '2023-09-06T10:27:56.515865Z',
          },
          {
            form_id: '1234-567f',
            gif: 'https://media/transcoded/1234-56mib/thumbnails/preview.gif',
            label: '2 Got it. Thank you for... (transcribed)',
            media_id: '1234-56mib',
            media_duration: 7,
            media_type: 'video',
            media_url:
              'https://media/transcoded/1234-56mib/video.mp4?token=eyJ',
            question_id: '1234-56qc',
            share_id: 'share_id1',
            share_url: 'https://www.videoask.com/share_id1',
            thumbnail:
              'https://media/transcoded/1234-56mib/thumbnails/image.0000002.jpg',
            transcode_status: 'completed',
            transcribe_status: 'completed',
            transcription:
              "Got it. Thank you for sharing. I'd like to get some more details.",
            transcription_data: [
              {
                words: [
                  {
                    word: 'Got',
                    end_time: 1.2,
                    start_time: 1,
                  },
                  {
                    word: 'it.',
                    end_time: 1.6,
                    start_time: 1.2,
                  },
                  {
                    word: 'Thank',
                    end_time: 2,
                    start_time: 1.7,
                  },
                  {
                    word: 'you',
                    end_time: 2.1,
                    start_time: 2,
                  },
                  {
                    word: 'for',
                    end_time: 2.3,
                    start_time: 2.1,
                  },
                  {
                    word: 'sharing.',
                    end_time: 2.9,
                    start_time: 2.4,
                  },
                  {
                    word: "I'd",
                    end_time: 3.3,
                    start_time: 3.1,
                  },
                  {
                    word: 'like',
                    end_time: 3.5,
                    start_time: 3.4,
                  },
                  {
                    word: 'to',
                    end_time: 3.6,
                    start_time: 3.5,
                  },
                  {
                    word: 'get',
                    end_time: 3.8,
                    start_time: 3.7,
                  },
                  {
                    word: 'some',
                    end_time: 4,
                    start_time: 3.8,
                  },
                  {
                    word: 'more',
                    end_time: 4.1,
                    start_time: 4,
                  },
                  {
                    word: 'details.',
                    end_time: 4.6,
                    start_time: 4.1,
                  },
                ],
                confidence: 0.9761192307692308,
                transcript:
                  "Got it. Thank you for sharing. I'd like to get some more details.",
              },
            ],
            type: 'standard',
            updated_at: '2023-09-06T10:28:53.758753Z',
            created_at: '2023-09-06T10:28:18.073756Z',
          },
          {
            form_id: '1234-567f',
            gif: 'https://media/transcoded/1234-56mic/thumbnails/preview.gif',
            label: '3 What are the current symptoms... (transcribed)',
            media_id: '1234-56mic',
            media_duration: 6,
            media_type: 'video',
            media_url: 'https://media/transcoded/1234-56mic/video.mp4?token=ey',
            question_id: '1234-56qid',
            share_id: 'share_id1',
            share_url: 'https://www.videoask.com/share_id1',
            thumbnail:
              'https://media/transcoded/1234-56mic/thumbnails/image.0000002.jpg',
            transcode_status: 'completed',
            transcribe_status: 'completed',
            transcription: "What are the current symptoms you're experiencing?",
            transcription_data: [
              {
                words: [
                  {
                    word: 'What',
                    end_time: 1.3,
                    start_time: 1.1,
                  },
                  {
                    word: 'are',
                    end_time: 1.4,
                    start_time: 1.3,
                  },
                  {
                    word: 'the',
                    end_time: 1.6,
                    start_time: 1.4,
                  },
                  {
                    word: 'current',
                    end_time: 1.9,
                    start_time: 1.6,
                  },
                  {
                    word: 'symptoms',
                    end_time: 2.5,
                    start_time: 1.9,
                  },
                  {
                    word: "you're",
                    end_time: 3,
                    start_time: 2.6,
                  },
                  {
                    word: 'experiencing?',
                    end_time: 3.4,
                    start_time: 3,
                  },
                ],
                confidence: 0.9667300000000001,
                transcript:
                  "What are the current symptoms you're experiencing?",
              },
            ],
            type: 'standard',
            created_at: '2023-09-06T10:28:49.291963Z',
            updated_at: '2023-09-06T10:29:05.298060Z',
          },
        ],
        variables: [
          {
            key: 'section_id',
            type: 'string',
          },
          {
            key: 'contact_email',
            type: 'string',
          },
          {
            key: 'contact_name',
            type: 'string',
          },
          {
            key: 'contact_user_id',
            type: 'string',
          },
          {
            key: 'section_name',
            type: 'string',
          },
          {
            key: 'series_id',
            type: 'string',
          },
          {
            key: 'section_status',
            type: 'string',
          },
          {
            key: 'next_section_id',
            type: 'string',
          },
          {
            key: 'subtitle',
            type: 'string',
          },
          {
            key: 'contact_phone_number',
            type: 'string',
          },
        ],
        created_at: '2023-09-06T10:27:18.599922Z',
        updated_at: '2023-10-09T09:06:11.143076Z',
      },
    },
  },
};
