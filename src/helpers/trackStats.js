const turf = require('@turf/turf');
const distance = require('turf-vincenty-inverse');
const toKilometers = require('./toKilometers');
const chechpointTimes = require('./checkpointTimes');

module.exports = async (geoJSON, start_date) => {

  const radius = 100; // Максимальное расстояние в метрах от трека до КП, в пределах которого будет происходить поиск

  const track = (geoJSON?.features || []).reduce((accumulator, feature) => {
    if (feature?.geometry?.type === 'LineString') {
      return feature.geometry;
    }

    return accumulator;
  }, {});

  const points = (geoJSON?.features || []).reduce((accumulator, feature) => {
    if (feature?.geometry?.type === 'Point' && feature?.properties?.name) {
      accumulator.push(feature);
    }

    return accumulator;
  }, []);

  const checkpoints = points.map(feature => {
    const point = turf.nearestPointOnLine(track, feature.geometry);
    const circle = turf.circle(point, radius, {steps: 8, units: 'meters'});

    return {
      name: feature.properties.name,
      point,
      circle,
      original: feature,
      distance: 0,
      distances: [],
    };
  });

  const total = turf.segmentReduce(track, (accumulator, segment) => {
    const unit = 'radians'; // В библиотеке есть баг с единицами изменения - вместо радианов придут метры
    const points = turf.explode(segment).features;

    if (points.length === 2) {
      checkpoints.forEach(checkpoint => {
        const intersect = turf.lineIntersect(segment, checkpoint.circle);

        if (intersect.features.length) {
          // Отнимаем радиус от вычисленной дистанции, поскольку позднее почти всегда мы будем использовать меньшую из вычисленных дистанций
          checkpoint.distance = accumulator + parseFloat(distance(points[0], intersect.features[0], unit)) - radius;

          checkpoint.distances.push(checkpoint.distance);
        }
      });

      accumulator += parseFloat(distance(points[0], points[1], unit));
    }

    return accumulator;
  }, 0);

  const brmDistance = (require('./brmDistance'))(total / 1000);

  // Сортируем КП по возрастанию

  checkpoints.sort((a, b) => {
    const a_num = (/^КП\s*(\d+)/.exec(a.name)?.[1] || 0) | 0;
    const b_num = (/^КП\s*(\d+)/.exec(b.name)?.[1] || 0) | 0;

    if (a_num && !b_num) {
      return -1;
    }

    if (!a_num && b_num) {
      return 1;
    }

    if (a_num && b_num) {
      if (a_num === b_num) {
        return 0;
      }

      return a_num > b_num ? 1 : -1;
    }

    return 0;
  });

  // Первый КП

  if (checkpoints.length) {
    if (checkpoints[0].distances.length) {
      checkpoints[0].distance = Math.min(...checkpoints[0].distances);
    }

    if (checkpoints[0].distance <= 2 * radius) {
      checkpoints[0].distance = 0;
    }

    // Последний КП
    // Добавляем два радиуса - один был вычтен при рассчёте, второй для вычисления реального расстояния.

    const l = checkpoints.length - 1;

    if (l > 0) {
      if (checkpoints[l].distances.length) {
        checkpoints[l].distance = Math.max(...checkpoints[l].distances) + 2 * radius;
      }

      if (checkpoints[l].distance >= total - 2 * radius && checkpoints[l].distance <= total + 2 * radius) {
        // Поправка на финиш
        checkpoints[l].distance = total;
      }
    }

    // Если КП расположен ближе к встречной полосе, расстояние будет рассчитано неправильно (как для пути "туда") - исправляем.

    for (let i = 1; i < checkpoints.length - 2; i++) {
      if (checkpoints[i].distances.length) {
        checkpoints[i].distance = Math.min(...checkpoints[i].distances.filter(v => {
          // Оставляем только значения, которые больше чем предыдущий КП
          if (v <= checkpoints[i - 1]?.distance) {
            return false;
          }

          const adjusted = toKilometers(v + 2 * radius);

          if (adjusted === toKilometers(v)) {
            // Если поправка не существенна, не делаем следующую проверку
            return true;
          }

          // Если при округлении есть два расстояния, с разницей в два радиуса, учитываем бОльшую величину
          return !checkpoints[i].distances.filter(s => s !== v).map(toKilometers).includes(adjusted);
        }));
      }
    }
  }

  // Рассчитываем время открытия/закрытия КП

  if (start_date) {
    checkpoints.forEach(checkpoint => {
      const times = chechpointTimes(Math.min(checkpoint.distance / 1000, brmDistance), start_date);

      checkpoint.start_date = times.start_date;
      checkpoint.open = times.open;
      checkpoint.close = times.close;
    });
  }

  return {
    total,
    brmDistance,
    checkpoints,
  }
};
