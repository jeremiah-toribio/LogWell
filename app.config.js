const IS_PROD = process.env.REVENUE_CAT_KEY_IOS && !process.env.REVENUE_CAT_KEY_IOS.startsWith('test_');

export default ({ config }) => ({
  ...config,
  name: IS_PROD ? config.name : `${config.name} (Dev)`,
  extra: {
    ...config.extra,
    revenueCatKeyIos: process.env.REVENUE_CAT_KEY_IOS,
  },
});
