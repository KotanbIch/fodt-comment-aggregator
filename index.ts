import { config } from "dotenv";
config();

import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

type Comment = {
  'dc:creator': string; //автор комента
  'dc:date': string; //"2022-07-05T09:59:06",
  'text:p': string[]; //текст комента разбитый разбиениями линий
};

// text:p array in OfficeAnnotation looks like this:
// [
//   "Визит глав стран ЕС в Украину",
//   "https://youtu.be/5eWk8QDGwEQ",
//   "(0:48-0:55), (1:38-1:50)"
// ]

type TextSpan = {
  'text:s': string;
  '#text': string;
};

type TextFragment = {
  'text:span': (string | TextSpan | SpanComment)[];
  'office:annotation': Comment[];
  'text:soft-page-break': '' | undefined;
};

type SpanComment = {
  'office:annotation': Comment;
};

type XmlDocument = {
  '?xml': string;
  'office:document': {
    'office:body': {
      'office:text': {
        'text:p': (string | TextFragment)[];
      };
    };
  };
};

(async () => {
  const xmlText = fs.readFileSync(process.env.FILE_NAME);
  const parser = new XMLParser();
  const xmlDocument: XmlDocument = parser.parse(xmlText);
  const authorToCommentsMap: { [key: string]: Comment[] } = {};
  for (const textFragment of xmlDocument['office:document']['office:body'][
    'office:text'
  ]['text:p']) {
    const comments: Comment[] =
      (textFragment as TextFragment)?.['office:annotation'] ||
      Array.isArray((textFragment as TextFragment)?.['text:span']) &&
        (textFragment as TextFragment)['text:span']
          .map((span) => (span as SpanComment)['office:annotation'])
          .filter((comment) => comment);
    if (!comments?.length) {
      continue;
    }
    for (const comment of comments) {
      const commentAuthor: string = comment['dc:creator'];
      if (!authorToCommentsMap[commentAuthor]) {
        authorToCommentsMap[commentAuthor] = [];
      }
      authorToCommentsMap[commentAuthor].push(comment);
    }
  }
  const authorToCommentsAmountMap: { [key: string]: number } = Object.keys(
    authorToCommentsMap,
  ).reduce(
    (map, author) => ({ ...map, [author]: authorToCommentsMap[author].length }),
    {},
  );
  // console.log(JSON.stringify(authorToCommentsMap[ 'Ventian Chareen'], null, 2));
  console.log(authorToCommentsAmountMap);
  // fs.writeFileSync(
  //   'authorToCommentsMap.json',
  //   JSON.stringify(authorToCommentsMap),
  // );
})();
