import { getTimeSeatCount } from './crawling';

// const TICKET_DATA = {
//   movie_index: process.env.MOVIE_INDEX,
//   theater_cd: process.env.THEATER_CD,
// };

(async () => {
  if (!process.env.MOVIE_INDEX || !process.env.THEATER_CD) {
    throw new Error('Check .env config!');
  }
  const timeList = await getTimeSeatCount(
    process.env.MOVIE_INDEX,
    process.env.THEATER_CD,
  );
  console.dir({ timeList });
})();
