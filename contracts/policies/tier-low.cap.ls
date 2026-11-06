{
  $require($subjectPolicy == 0xd5219ccb2aa29c9f08f1d3b9be5d12a4ab378065db3445aae1882871da17570a),
  $require($subjectVault == 0x371B4E49A510Ee007d7879783B309128975CC1A1),
  $require($subjectId == 0xc918a5f1cb2670f14afa8bb1928f6a298e37fe1eb914df1b4ec7da9e9f38222a),
  $require($subjectNativeValue == 0),
  $require($subjectArgCount == 2),
  $require($subjectArg(1) > 0 && $subjectArg(1) < 50000000000)
}
