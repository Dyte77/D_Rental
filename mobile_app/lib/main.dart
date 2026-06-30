import 'package:flutter/material.dart';
import 'screens/register_screen.dart';
import 'screens/login_screen.dart';
import 'screens/listings_screen.dart';
import 'screens/listing_detail_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rental Connect',
      initialRoute: "/listings",
      routes: {
        "/login": (context) => const LoginScreen(),
        "/register": (context) => const RegisterScreen(),
        "/listings": (context) => const ListingsScreen(),
      },
      // onGenerateRoute handles routes that need to receive arguments,
      // like which specific listing to show — the simple `routes` map
      // above only supports routes with no dynamic data attached.
      onGenerateRoute: (settings) {
        if (settings.name == "/listing-detail") {
          final listingId = settings.arguments as int;
          return MaterialPageRoute(
            builder: (context) =>
                ListingDetailScreen(listingId: listingId),
          );
        }
        return null;
      },
    );
  }
}