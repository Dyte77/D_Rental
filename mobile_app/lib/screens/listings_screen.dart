import 'package:flutter/material.dart';

/// Placeholder for now — we'll build the real browse/search listings
/// screen next. This just confirms navigation after login works.
class ListingsScreen extends StatelessWidget {
  const ListingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Listings")),
      body: const Center(child: Text("Login successful! Listings go here.")),
    );
  }
}