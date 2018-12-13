desc('Countdown');
task('countdown', { async: true }, (i = 8) => {
  if (!process.env.MSG) return;
  console.log('');
  const t = setInterval(() => {
    process.stdout.write('\r' + process.env.MSG + ' ' + i);
    !i-- && (clearInterval(t) || true) && console.log('\n');
  }, 1000);
});
