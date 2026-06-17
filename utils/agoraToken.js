import { RtcTokenBuilder, RtcRole } from "agora-token";

export const toAgoraUid = (userId) => {
  const hex = userId.toString().slice(-8);
  return parseInt(hex, 16) % 2147483647 || 1;
};

export const buildAgoraToken = (channelName, userId, role = RtcRole.PUBLISHER) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error("AGORA_APP_ID and AGORA_APP_CERTIFICATE are required in .env");
  }

  const uid = toAgoraUid(userId);
  const expireSeconds = Number(process.env.AGORA_TOKEN_EXPIRE || 3600);
  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + expireSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    expireAt,
    expireAt
  );

  return { token, uid, appId, channelName, expireAt };
};
