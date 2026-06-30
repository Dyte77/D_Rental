/// Represents a logged-in user. Built from the JSON response our
/// backend sends back after login/register — having a proper class
/// instead of passing raw Maps around means typos in field names get
/// caught at compile time instead of causing silent runtime bugs.
class User {
  final int id;
  final String fullName;
  final String email;
  final String role;
  final bool isVerified;

  User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.isVerified,
  });

  /// A "factory constructor" — a special Dart pattern for building an
  /// object from an alternate source, here a JSON Map. This is the
  /// equivalent of writing a small "parse this row" function for data
  /// coming from an external source, similar in spirit to how we
  /// trusted only specific columns when building safe API responses
  /// on the backend.
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json["id"],
      fullName: json["full_name"],
      email: json["email"],
      role: json["role"],
      isVerified: json["is_verified"] ?? false,
    );
  }
}