// require('dotenv').config();
import { config } from 'dotenv';
import { DateSeatCount, TimeSeatCount } from '../types';
import puppeteer, { Frame, ElementHandle } from 'puppeteer';

config();

/**
 * puppteer brower 생성 후, 반환한다.
 */
const initializeBrwoser = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://www.cgv.co.kr/ticket');
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
    throw new Error('No Frame!');
  }
  return { browser, page, frame };
};

/**
 * 파라미터로 받는 index의 영화를 선택한다.
 *
 * @return  {[type]}  [return description]
 */
const selectMovie = async (
  frame: Frame,
  movieIndex: string,
  imaxOnly = false,
) => {
  const movieSelector = `#movie_list > ul > li[movie_idx="${movieIndex}"] > a`;
  const movieEl = await frame.$(movieSelector);
  if (!movieEl) {
    throw new Error('Not Exist Movie Element');
  }
  await movieEl.click();
  const title = await frame.$eval(
    `${movieSelector} > .text`,
    (el) => (el as HTMLElement).innerText,
  );
  await frame.waitForTimeout(1000);

  const movieTypeSelection = `.selectbox-movie-type  ${
    imaxOnly ? '#sbmt_imax' : '#sbmt_all'
  } > a`;
  await frame.$eval(movieTypeSelection, (el) => {
    (el as HTMLAnchorElement).click();
  });
  return title;
};

/**
 * 파라미터로 받는 영화관을 선택한다.
 *
 * @param   {Frame}     frame      [frame description]
 * @param   {string}  theaterCd  [theaterCd description]
 *
 * @return  {[type]}             [return description]
 */
const selectTheater = async (frame: Frame, theaterCd: string) => {
  const theaterName = await frame.$eval(
    `#theater_area_list > ul > li.selected > div > ul > li[theater_cd="${theaterCd}"]`,
    (el: HTMLElement) => {
      (el.firstChild as HTMLAnchorElement)?.click();
      return el.innerText;
    },
  );
  return theaterName;
};

const clickDateByDateEl = async (
  frame: Frame,
  dateEl: ElementHandle<HTMLLIElement>,
) => {
  const dateStr = await frame.evaluate(
    (el: HTMLElement) => el.getAttribute('date'),
    dateEl,
  );
  const dayStr = await dateEl.$eval(
    'a > .dayweek',
    (el) => (el as HTMLElement).innerText,
  );
  await dateEl.click();
  return { dateStr, dayStr };
};

const selectDates = async (frame: Frame) => {
  const selectableDates = await frame.$$(
    `#date_list > ul > div > li:not(.dimmed)`,
  );
  return selectableDates;
};

const selectScreens = async (frame: Frame) => {
  return await frame.$$(
    '#ticket > div.steps > div.step.step1 > div.section.section-time > div.col-body > div.time-list.nano.has-scrollbar > div.content.scroll-y > div.theater',
  );
};

export const getTimeSeatCount = async (
  movieIndex: string,
  theaterCd: string,
  imaxOnly = false,
) => {
  const { browser, frame } = await initializeBrwoser();

  const title = await selectMovie(frame, movieIndex, imaxOnly);
  console.log(`1. 영화 선택: ${title} ${imaxOnly ? 'IMAX' : ''}`);

  await frame.waitForTimeout(1000);

  const theaterName = await selectTheater(frame, theaterCd);
  console.log(`3. 영화관 선택: ${theaterName}`);
  await frame.waitForTimeout(1000);

  const dateElList = await selectDates(frame);
  console.log('4. 날짜 선택');

  const result: {
    [key: string]: {
      [key: string]: {
        [x: string]: string;
      }[];
    }[];
  }[] = [];

  dateElList.forEach(async (dateEl) => {
    const { dateStr, dayStr } = await clickDateByDateEl(frame, dateEl);
    console.log({ date: `${dateStr}_${dayStr}` });
    await frame.waitForTimeout(1000);

    const screenEls = await selectScreens(frame);

    const screenCountMapList: {
      [key: string]: {
        [x: string]: string;
      }[];
    }[] = [];

    screenEls.forEach(async (screenEl) => {
      const screenInfo = await screenEl.$eval(
        'span.title',
        (el) => el.innerText,
      );
      console.log(screenInfo);

      const timeCountMapList = await screenEl.$$eval('ul > li', (timeEls) => {
        const timeCountMapList = timeEls.map((el) => {
          const timeStr = (
            el.querySelector('span.time > span') as HTMLSpanElement
          ).innerText;
          const countStr = (el.querySelector('span.count') as HTMLSpanElement)
            .innerText;

          console.log({ [timeStr]: countStr });
          return {
            [timeStr]: countStr,
          };
        });
        return timeCountMapList;
      });
      screenCountMapList.push({ [screenInfo]: timeCountMapList });
    });

    result.push({ [`${dateStr}_${dayStr}`]: screenCountMapList });
  });

  console.dir(result);
  //   await browser.close();
  return result;
};
