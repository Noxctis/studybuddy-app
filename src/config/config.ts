export default {
  api: {
    apiEendpoint:  import.meta.env.VITE_API_ENDPOINT,
    wsEndpoint: import.meta.env.VITE_WS_ENDPOINT
  },
  timer: {
    speedMultiplier: +(import.meta.env.VITE_TIMER_SPEED_MULTIPLIER ?? 1),
    shortPomoMinutes: +(import.meta.env.VITE_TIMER_MINUTES_SHORTPOMO ?? 5),
    longBreakMinutes: +(import.meta.env.VITE_TIMER_MINUTES_LONGBREAK ?? 15),
    forceStopMinutes: +(import.meta.env.VITE_TIMER_MINUTES_FORCESTOP ?? 150),
    postponeforceStopMinutes: +(import.meta.env.VITE_TIMER_MINUTES_POSTPONRFORCESTOP ?? 60),
    forceStopAlertMinutesBefore: +(import.meta.env.VITE_TIMER_MINUTES_BEFOREFORCESTOPALERT ?? 15),
  }
}