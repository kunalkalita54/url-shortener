import Click from '../models/click.model.js';
import Url from '../models/url.model.js';

export async function getUrlAnalytics (req, res) {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode, owner: req.user._id });
    if (!url) {
      return res.status(404).json({ message: 'URL not found' });
    }

    const result = await Click.aggregate([
      { $match: { shortCode } },

      {
        $facet: {
          totalClicks: [
            { $count: 'count' }
          ],

          clicksOverTime: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],

          topReferrers: [
            { $group: { _id: '$referrer', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],

          deviceBreakdown: [
            { $group: { _id: '$device', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],

          browserBreakdown: [
            { $group: { _id: '$browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const analytics = result[0];
    const totalClicks = analytics.totalClicks.length > 0 ? analytics.totalClicks[0].count : 0;

    return res.status(200).json({
      shortCode,
      totalClicks,
      clicksOverTime: analytics.clicksOverTime,
      topReferrers: analytics.topReferrers,
      deviceBreakdown: analytics.deviceBreakdown,
      browserBreakdown: analytics.browserBreakdown
    });

  } catch (err) {
    console.error('Analytics aggregation error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};