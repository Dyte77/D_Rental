import 'package:flutter/material.dart';
import '../services/api_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // GlobalKey lets us reference and validate the Form widget below
  // from outside its own build method — Flutter's standard pattern
  // for form validation.
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();

  // Controllers hold the actual current text in each input field —
  // Flutter's equivalent of binding an <input>'s value in a web form.
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  String _selectedRole = "tenant";
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleRegister() async {
    // validate() runs every field's validator function (defined below)
    // and returns false if any of them fail — exactly mirroring the
    // Joi validation we built on the backend, just running client-side
    // first for instant feedback before the request is even sent.
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final response = await _apiService.register(
      fullName: _fullNameController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      role: _selectedRole,
    );

    setState(() {
      _isLoading = false;
    });

    if (response["success"] == true) {
      if (!mounted) return;
      // Registration succeeded — send the user to the login screen
      // next, since registering doesn't automatically log them in.
      Navigator.pushReplacementNamed(context, "/login");
    } else {
      setState(() {
        _errorMessage = response["error"] ?? "Registration failed.";
      });
    }
  }

  @override
  void dispose() {
    // Controllers must be disposed to free memory when this screen
    // is removed — forgetting this is a common, real source of
    // memory leaks in Flutter apps.
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Create Account")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(labelText: "Full Name"),
                validator: (value) {
                  if (value == null || value.trim().length < 2) {
                    return "Please enter your full name.";
                  }
                  return null;
                },
              ),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: "Email"),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || !value.contains("@")) {
                    return "Please enter a valid email.";
                  }
                  return null;
                },
              ),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: "Phone Number"),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.trim().length < 9) {
                    return "Please enter a valid phone number.";
                  }
                  return null;
                },
              ),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: "Password"),
                obscureText: true,
                validator: (value) {
                  if (value == null || value.length < 8) {
                    return "Password must be at least 8 characters.";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                decoration: const InputDecoration(labelText: "I am a..."),
                items: const [
                  DropdownMenuItem(value: "tenant", child: Text("Tenant")),
                  DropdownMenuItem(value: "landlord", child: Text("Landlord")),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedRole = value!;
                  });
                },
              ),
              const SizedBox(height: 24),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleRegister,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text("Register"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}