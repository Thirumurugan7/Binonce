{
  $require($subjectVault == 0x371B4E49A510Ee007d7879783B309128975CC1A1),
  $require($subjectNativeValue == 0),
  $require($subjectArgCount == 2),
  $require($arg0 != 0),
  $require($arg1 > 0),
  $require(@token(demo/usdc).transfer($arg0 :: address, $arg1 :: uint256))
}
