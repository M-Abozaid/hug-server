Summary: Front end for Hug@Home Backend application
Name: hug-home-backend
Version: 1.0.0
Release: 0
Group: Web Application
License: HUG
Source: %{name}-%{version}.tar.gz
BuildRoot: %{_tmppath}/%{name}-root
Requires: nodejs
BuildArch: noarch

%define _binaries_in_noarch_packages_terminate_build   0

%description
SPECS version 1

%prep
#%setup -c SPECS
%__rm -rf %{_topdir}/BUILD
%__cp -a %{_sourcedir} %{_topdir}/BUILD

%install
%{__make} install
%{__install} -d -m0755 %{buildroot}/%{_datadir}/%{name}/
%{__cp} -a app.js bin config helpers init models node_modules package.json public src views %{buildroot}/%{_datadir}/%{name}/
%{__install} -d -m0755 %{buildroot}/%{_libdir}/systemd/system
%{__cp} redhat/hug-home.service %{buildroot}/%{_libdir}/systemd/system

%clean
%{__rm} -rf %{buildroot}

%files
%defattr(-,root,root, 0755)
%{_datadir}/%{name}/
%{_libdir}/systemd/system/

%post
## Commands to for the post install


%changelog
* Wed Apr 17 2019 Olivier Bitsch <olivier.b@iabsis.com>
- Initial spec file for hug-home-backend package.
