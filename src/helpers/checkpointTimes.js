const moment = require('moment');

/**
 * @param distance - Расстояние до КП в километрах
 * @param start_date
 * @returns {{start_date: *, open: {date: *, diff: string}, close: {date: *, diff: string}}}
 */
module.exports = (distance, start_date) => {
  distance = parseFloat(distance) || 0;

  if (!start_date) {
    start_date = new Date();
  }

  start_date = moment(start_date).utcOffset(0);

  const diff = time => {
    const date = moment.utc(moment(time).diff(moment(start_date).set('seconds', 0))).add(2, 'second'); // Добавим две секунды для лучшего округления
    const days = (date.format('D') | 0) - 1;

    return `${days ? days + ' д. ' : ''}${date.format('H:mm')}`;
  };

  const open = ((distance) => {
    const start = moment(start_date).set('seconds', 0);
    let end = start;

    if (distance !== 0) {
      if (distance > 0) {
        // 0 ... 200
        end = end.add(Math.min(distance, 200) / 34, 'hours');
        distance -= 200;
      }

      if (distance > 0) {
        // 200 ... 400
        end = end.add(Math.min(distance, 200) / 32, 'hours');
        distance -= 200;
      }

      if (distance > 0) {
        // 400 ... 600
        end = end.add(Math.min(distance, 200) / 30, 'hours');
        distance -= 200;
      }

      if (distance > 0) {
        // 600 ... 1000
        end = end.add(Math.min(distance, 400) / 28, 'hours');
        distance -= 400;
      }

      if (distance > 0) {
        // 1000 ... 1200
        end = end.add(Math.min(distance, 200) / 26, 'hours');
        distance -= 200;
      }

      if (distance > 0) {
        // 1200 ... 1800
        end = end.add(Math.min(distance, 600) / 25, 'hours');
        distance -= 600;
      }

      if (distance > 0) {
        // 1800 ...
        end = start.add(distance / 24, 'hours');
      }
    }

    if (end.get('seconds') >= 30) {
      end.add(1, 'minute');
    }

    end.set('seconds', 0);

    return end.toDate();
  })(distance);

  const close = ((distance) => {
    const start = moment(start_date).set('seconds', 0);
    let end;

    if (distance === 0) {
      end = start.add(1, 'hour');
    }
    else if (distance <= 60) {
      end = start.add(distance / 20, 'hours').add(1, 'hour');
    }
    else if (distance === 200) {
      end = start.add(13.5, 'hours');
    }
    else if (distance === 300) {
      end = start.add(20, 'hours');
    }
    else if (distance === 350) {
      end = start.add(24, 'hours'); // Флеш
    }
    else if (distance === 400) {
      end = start.add(27, 'hours');
    }
    else if (distance === 600) {
      end = start.add(40, 'hours');
    }
    else if (distance === 1000) {
      end = start.add(75, 'hours');
    }
    else if (distance === 1200) {
      end = start.add(90, 'hours');
    }
    else {
      end = start;

      if (distance > 0) {
        // 0 ... 600
        end = start.add(Math.min(distance, 600) / 15, 'hours');
        distance -= 600;
      }

      if (distance > 0) {
        // 600 ... 1000
        end = start.add(Math.min(distance, 400) / 11.428, 'hours');
        distance -= 400;
      }

      if (distance > 0) {
        end = start.add(distance / 13.333, 'hours');
      }
    }

    if (end.get('seconds') >= 30) {
      end.add(1, 'minute')
    }

    end.set('seconds', 0);

    return end.toDate();
  })(distance);

  return {
    start_date,
    open: {
      date: open,
      time: diff(open),
    },
    close: {
      date: close,
      time: diff(close),
    },
  };
};