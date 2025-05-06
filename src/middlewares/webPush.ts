import webPush from 'web-push';

export function configureWebPush() {
  webPush.setVapidDetails(
    `mailto:${process.env.MY_MAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export default webPush;
