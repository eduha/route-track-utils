const turf = require('@turf/turf');
const distance = require('turf-vincenty-inverse');

module.exports = async (geoJSON) => {

  const radius = 0.040;

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
    const circle = turf.circle(point, radius, {steps: 8});

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
          checkpoint.distance = accumulator + parseFloat(distance(points[0], intersect.features[0], unit)) - radius / 2;

          checkpoint.distances.push(checkpoint.distance);
        }
      });

      accumulator += parseFloat(distance(points[0], points[1], unit));
    }

    return accumulator;
  }, 0);

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

  // Первый и последний КП

  checkpoints[0].distance = Math.min(...checkpoints[0].distances);
  checkpoints[checkpoints.length - 1].distance = Math.max(...checkpoints[checkpoints.length - 1].distances);

  // Если КП расположен ближе к встречной полосе, расстояние будет рассчитано неправильно (как для пути "туда") - исправляем.

  for (let i = 1; i < checkpoints.length - 2; i++) {
    checkpoints[i].distance = Math.min(...checkpoints[i].distances.filter(v => v > checkpoints[i - 1].distance));
  }

  return {
    total,
    checkpoints,
  }
};
