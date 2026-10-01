export const MOTION_MS = {
  press: 80,
  control: 110,
  menu: 130,
  content: 150,
  dialog: 170,
} as const;

export const MOTION_SECONDS = {
  press: MOTION_MS.press / 1000,
  control: MOTION_MS.control / 1000,
  menu: MOTION_MS.menu / 1000,
  content: MOTION_MS.content / 1000,
  dialog: MOTION_MS.dialog / 1000,
} as const;
