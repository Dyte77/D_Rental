import 'package:flutter/material.dart';
import 'services/api_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rental Connect',
      home: const ApiTestScreen(),
    );
  }
}

/// Temporary screen used only to confirm the Flutter app can actually
/// reach the real backend. This will be deleted once we build real
/// register/login screens.
class ApiTestScreen extends StatefulWidget {
  const ApiTestScreen({super.key});

  @override
  State<ApiTestScreen> createState() => _ApiTestScreenState();
}

class _ApiTestScreenState extends State<ApiTestScreen> {
  final ApiService _apiService = ApiService();
  String _result = "No request made yet.";

  Future<void> _testRegister() async {
    final response = await _apiService.register(
      fullName: "Flutter Test User",
      email: "fluttertest@example.com",
      phone: "0788444555",
      password: "testpassword123",
      role: "tenant",
    );

    setState(() {
      _result = response.toString();
    });
  }

  Future<void> _testLogin() async {
    final response = await _apiService.login(
      email: "fluttertest@example.com",
      password: "testpassword123",
    );

    setState(() {
      _result = response.toString();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("API Connection Test")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ElevatedButton(
              onPressed: _testRegister,
              child: const Text("Test Register"),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _testLogin,
              child: const Text("Test Login"),
            ),
            const SizedBox(height: 20),
            Text(_result),
          ],
        ),
      ),
    );
  }
}