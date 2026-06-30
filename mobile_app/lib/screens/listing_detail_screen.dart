import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class ListingDetailScreen extends StatefulWidget {
  // Rather than re-fetching from scratch, we accept the listing ID
  // from whichever screen navigated here — the listings screen, in
  // our case, when a card is tapped.
  final int listingId;

  const ListingDetailScreen({super.key, required this.listingId});

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  final ApiService _apiService = ApiService();
  late Future<Listing> _listingFuture;

  @override
  void initState() {
    super.initState();
    _listingFuture = _apiService.getListingDetail(widget.listingId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Listing Details")),
      body: FutureBuilder<Listing>(
        future: _listingFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          }

          final listing = snapshot.data!;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (listing.imageUrls.isNotEmpty)
                  SizedBox(
                    height: 220,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: listing.imageUrls.length,
                      itemBuilder: (context, index) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Image.network(
                            listing.imageUrls[index],
                            width: 280,
                            fit: BoxFit.cover,
                          ),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 16),
                Text(
                  "UGX ${listing.priceePerMonth} / month",
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text("Status: ${listing.status}"),
                const SizedBox(height: 16),

                // This is the genuinely interesting part: when the
                // backend's locked flag is true, we show only what
                // it sent (price, status, images — already displayed
                // above) plus a clear prompt to log in, rather than
                // trying to display fields that simply don't exist
                // in a locked response.
                if (listing.locked)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          listing.lockedMessage ??
                              "Log in to see full details.",
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pushNamed(context, "/login");
                          },
                          child: const Text("Log In"),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Text(
                    listing.title ?? "",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (listing.district != null)
                    Text("District: ${listing.district}"),
                  if (listing.roomType != null)
                    Text("Room type: ${listing.roomType}"),
                  const SizedBox(height: 12),
                  if (listing.description != null)
                    Text(listing.description!),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}