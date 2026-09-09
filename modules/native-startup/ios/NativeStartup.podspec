require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'NativeStartup'
  s.version = package['version']
  s.summary = 'Native process startup timing for Yougabell.'
  s.license = 'UNLICENSED'
  s.author = 'Yougabell'
  s.homepage = 'https://github.com/four-lovely-fairies/yougabell-mobile'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.source = { :git => 'https://github.com/four-lovely-fairies/yougabell-mobile.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.resource_bundles = { 'NativeStartup_privacy' => ['PrivacyInfo.xcprivacy'] }
end
