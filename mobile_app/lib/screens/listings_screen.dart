import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class ListingsScreen extends StatefulWidget {
  const ListingsScreen({super.key});

  @override
  State<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends State<ListingsScreen> {
  final ApiService _apiService = ApiService();

  // We store the Future itself in a field, created once in initState,
  // rather than calling getListings() directly inside build(). This
  // matters: build() can run many times (e.g. on any setState call),
  // and calling an API method inside it would trigger a brand new
  // network request every single time the screen redraws for ANY
  // reason — a real, common Flutter mistake worth avoiding from day one.
  late Future<List<Listing>> _listingsFuture;

  @override
  void initState() {
    super.initState();
    _listingsFuture = _apiService.getListings();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Browse Listings"),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pushNamed(context, "/login");
            },
            child: const Text(
              "Log In",
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: FutureBuilder<List<Listing>>(
        future: _listingsFuture,
        builder: (context, snapshot) {
          // While the network request is still in flight.
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          // The Future completed, but with an error (e.g. our thrown
          // Exception from getListings, or a network failure).
          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }

          final listings = snapshot.data ?? [];

          if (listings.isEmpty) {
            return const Center(child: Text("No listings available yet."));
          }

          return ListView.builder(
            itemCount: listings.length,
            itemBuilder: (context, index) {
              final listing = listings[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  onTap: () {
                    Navigator.pushNamed(
                      context,
                      "/listing-detail",
                      arguments: listing.id,
                    );
                  },
                  leading: listing.imageUrls.isNotEmpty
                      ? Image.network(
                          listing.imageUrls.first,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        )
                      : const Icon(Icons.home, size: 40),
                  title: Text(listing.title ?? "Listing"),
                  subtitle: Text(
                    "UGX ${listing.priceePerMonth} / month"
                    "${listing.district != null ? ' • ${listing.district}' : ''}",
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}