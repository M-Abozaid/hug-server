Summary: Front end for Hug@Home Backend application
Name: hug-home-backend
Version: 2.0.0
Release: 8
Group: Web Application
License: HUG
Source: %{name}-%{version}.tar.gz
BuildRoot: %{_tmppath}/%{name}-root
#BuildRequires: nodejs
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
%{__cp} -a app.js api config node_modules package.json package-lock.json public tasks views %{buildroot}/%{_datadir}/%{name}/
%{__install} -d -m0755 %{buildroot}/lib/systemd/system
%{__cp} redhat/hug-home.service %{buildroot}/lib/systemd/system
%{__install} -d -m0755 %{buildroot}/%{_sysconfdir}/hug-home/
%{__cp} redhat/hug-home-backend.conf %{buildroot}/%{_sysconfdir}/hug-home/

%clean
%{__rm} -rf %{buildroot}

%files
%defattr(-,root,root, 0755)
%{_datadir}/%{name}/
/lib/systemd/system/
%{_sysconfdir}/hug-home/

%post
## Commands to for the post install
systemctl daemon-reload
#mkdir -p /usr/share/hug-home-backend/.tmp
#chown -R apache /usr/share/hug-home-backend/.tmp
#./node_modules/.bin/grunt build:production
mkdir -p /var/lib/hug-home/attachments/
chown -R apache /var/lib/hug-home/attachments/

%changelog
* Wed Apr 17 2019 Olivier Bitsch <olivier.b@iabsis.com>
- Initial spec file for hug-home-backend package.
