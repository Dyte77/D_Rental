import 'package:flutter/material.dart';
import 'screens/register_screen.dart';
import 'screens/login_screen.dart';
import 'screens/listings_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rental Connect',
      // initialRoute decides what screen shows first when the app
      // opens. For now we start at login; later this will likely be
      // a splash screen that checks for an existing valid session.
      initialRoute: "/login",
      // routes maps a String path to the Widget that should display
      // for it — this is what Navigator.pushNamed/pushReplacementNamed
      // actually look up when called from our screens.
      routes: {
        "/login": (context) => const LoginScreen(),
        "/register": (context) => const RegisterScreen(),
        "/listings": (context) => const ListingsScreen(),
      },
    );
  }
}