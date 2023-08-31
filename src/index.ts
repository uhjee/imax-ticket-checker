require('dotenv').config();
import { DateSeatCount, TimeSeatCount } from './types';

const puppeteer = require('puppeteer');

const TICKET_DATA = {
  movie_index: process.env.MOVIE_INDEX, // 오펜하이머
  theater_cd: process.env.THEATER_CD, // 왕십리
};

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // navigate
  await page.goto(
    'http://www.cgv.co.kr/ticket/?MOVIE_CD=20033397&MOVIE_CD_GROUP=20033175',
  );

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  let frame = null;

  for (const _frame of page.mainFrame().childFrames()) {
    if (
      _frame.url().includes('ticket.cgv.co.kr/Reservation/Reservation.aspx')
    ) {
      frame = _frame;
    }
  }
  if (!frame) {
    console.log('frame 없음');
    return;
  }

  // Select Movie
  const movieSelector = `#movie_list > ul > li[movie_idx="${TICKET_DATA.movie_index}"] > a`;
  const movieEl = await frame.$(movieSelector);
  await movieEl.click();
  const title = await frame.$eval(
    `${movieSelector} > .text`,
    (el: any) => el.innerText,
  );
  console.log(`1. 영화 선택: ${title}`);
  await frame.waitForTimeout(1000);

  // Select Movie Type -  imax  - 추후 optional 설정
  const imaxSelector = '.selectbox-movie-type  #sbmt_imax > a';
  await frame.$eval(imaxSelector, (el: HTMLElement) => el.click());
  console.log('2. imax 선택');
  await frame.waitForTimeout(1000);

  // Select Theater
  await frame.$eval(
    `#theater_area_list > ul > li.selected > div > ul > li[theater_cd="${TICKET_DATA.theater_cd}"]`,
    (el: HTMLElement) => (el.firstChild as HTMLAnchorElement)?.click(),
  );
  console.log('3. 극장 선택');
  await frame.waitForTimeout(1000);

  // Select Date & Loop to make list
  const selectableDates = await frame.$$(
    `#date_list > ul > div > li:not(.dimmed)`,
  );

  const timeList: DateSeatCount[] = [];

  for (let i = 0; i < selectableDates.length; i += 1) {
    await frame.waitForTimeout(1000);
    const dateEl = selectableDates[i];
    const dateStr = await (await dateEl.getProperty('textContent')).jsonValue();
    const dayStr = await dateEl.$eval(
      'a > .dayweek',
      (el: HTMLElement) => el.innerText,
    );
    await dateEl.click();

    const timeCountMap: TimeSeatCount[] = await frame.$$eval(
      '#ticket > div.steps > div.step.step1 > div.section.section-time > div.col-body > div.time-list.nano.has-scrollbar > div.content.scroll-y > div > ul > li',
      (els: HTMLElement[]) => {
        const timeMap = els.map((el) => {
          const timeStr = (
            el.querySelector('span.time > span') as HTMLSpanElement
          ).innerText;
          const countStr = (el.querySelector('span.count') as HTMLSpanElement)
            .innerText;

          return {
            [timeStr]: countStr,
          };
        });
        return timeMap;
      },
    );
    timeList.push([`${dateStr}(${dayStr})`, timeCountMap]);
  }
  console.dir({ timeList });

  console.log('4. 날짜 선택');

  // await browser.close();
})();
