{
  $require($subjectPolicy == 0xc98ecb15490603d72371a92cba6d9550ab1b8ca0e88b45df76cd1039f9249ff7),
  $require($subjectVault == 0x371B4E49A510Ee007d7879783B309128975CC1A1),
  $require($subjectId == 0xa9887591f70becfea94da39c8d8fa4b55c2b5f0c7d4df229d6e9ea8221f3c926),
  $require($subjectNativeValue == 0),
  $require($subjectArgCount == 2),
  $require($subjectArg(1) > 0 && $subjectArg(1) <= 1000000000000)
}
