# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-31

### Added
- Initial release of Craft Mailchimp module
- Core API service with transparent pass-through to Mailchimp API
- Enhanced JavaScript wrapper with 30+ helper methods
- Webhook support with event dispatching
- Rate limiting (30 requests/minute)
- CSRF protection for API endpoints
- Email validation with domain blocking
- Batch operations support (subscribe/unsubscribe)
- Tag management methods
- Segment handling
- Campaign interaction methods
- Automation workflow triggers
- Member search functionality
- Activity and event tracking
- Interest/group management
- Complete example templates:
  - Subscription status checker
  - Subscriber detail viewer
  - List information display
  - Signup URL retriever
- Reusable opt-in validator component
- Comprehensive documentation
- Integration test examples
- MIT license

### Features
- **Core Module**: Thin wrapper maintaining Mailchimp API structure
- **JavaScript API**: Rich client-side functionality with error handling
- **Webhooks**: Real-time notifications with security features
- **Examples**: Complete templates for common use cases
- **Documentation**: Detailed guides for all features

### Requirements
- Craft CMS 4.0+
- PHP 8.0.2+
- Mailchimp account with API key

### Installation
- Git submodule support
- PSR-4 autoloading
- Environment configuration
- Module bootstrapping