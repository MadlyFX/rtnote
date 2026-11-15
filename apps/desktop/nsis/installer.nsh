; Per-user Explorer verb. Runtime registration refreshes the label and exe path.
!macro customInstall
  WriteRegStr HKCU "Software\Classes\*\shell\RTNote" "" "发送到 RTNote"
  WriteRegStr HKCU "Software\Classes\*\shell\RTNote" "Icon" "$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0"
  WriteRegStr HKCU "Software\Classes\*\shell\RTNote" "MultiSelectModel" "Document"
  WriteRegStr HKCU "Software\Classes\*\shell\RTNote\command" "" "$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" --share-file $\"%1$\""
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\*\shell\RTNote"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RTNote"
  ClearErrors
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "RTNote"
  ClearErrors
!macroend
