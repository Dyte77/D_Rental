import 'dart:convert';
import '../models/listing.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Central place for all communication with the Rental Connect backend.
/// Every screen in the app should go through this class rather than
/// calling http directly — exactly like how your Express controllers
/// always go through the shared `pool` rather than each opening their
/// own database connection.
class ApiService {
  // Change this single value to switch between your local dev server
  // and the live Render deployment. Android emulators can't reach
  // "localhost" directly (it refers to the emulator itself, not your
  // computer) — they use this special address instead to reach your
  // host machine.
  static const String baseUrl = "http://10.0.2.2:3000/api";

  // Secure, encrypted on-device storage for our auth tokens — never
  // kept in a plain variable that would vanish on app restart, and
  // never stored in plain, unencrypted files.
  final _storage = const FlutterSecureStorage();

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: "access_token", value: accessToken);
    await _storage.write(key: "refresh_token", value: refreshToken);
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: "access_token");
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: "refresh_token");
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: "access_token");
    await _storage.delete(key: "refresh_token");
  }

  /// Registers a new user. Returns a Map representing the parsed JSON
  /// response — the caller decides what to do with success/error.
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String role,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/register"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "full_name": fullName,
        "email": email,
        "phone": phone,
        "password": password,
        "role": role,
      }),
    );

    return jsonDecode(response.body);
  }

  /// Logs a user in. On success, saves both tokens to secure storage
  /// automatically, so the caller doesn't have to remember to do it.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/login"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": email, "password": password}),
    );

    final data = jsonDecode(response.body);

    if (data["success"] == true) {
      await saveTokens(data["accessToken"], data["refreshToken"]);
    }

    return data;
  }

  /// Fetches the public list of available listings. This endpoint
  /// doesn't require authentication — same as the backend route,
  /// which is intentionally public so tenants can browse freely.
  Future<List<Listing>> getListings() async {
    final response = await http.get(Uri.parse("$baseUrl/listings"));

    final data = jsonDecode(response.body);

    if (data["success"] == true) {
      final List<dynamic> rawListings = data["listings"];
      return rawListings.map((json) => Listing.fromJson(json)).toList();
    } else {
      throw Exception(data["error"] ?? "Failed to load listings.");
    }
  }

  
}