/// Represents a single rental listing. Note that the backend sometimes
/// returns a LOCKED version of this data (for anonymous users — only
/// price, status, and images) and sometimes the FULL version (for
/// logged-in users). We handle both shapes by making every field
/// except id and price nullable, since a locked response simply won't
/// include them.
class Listing {
  final int id;
  final String? title;
  final String priceePerMonth;
  final String? district;
  final String? roomType;
  final String status;
  final bool locked;
  final List<String> imageUrls;

  Listing({
    required this.id,
    this.title,
    required this.priceePerMonth,
    this.district,
    this.roomType,
    required this.status,
    required this.locked,
    required this.imageUrls,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    // The "images" field is a list of objects like {id, image_url, ...}
    // — we only need the URL itself for displaying photos, so we map
    // over the raw list and extract just that one field from each.
    final List<dynamic> rawImages = json["images"] ?? [];
    final List<String> urls = rawImages
        .map((image) => image["image_url"] as String)
        .toList();

    return Listing(
      id: json["id"],
      title: json["title"],
      priceePerMonth: json["price_per_month"].toString(),
      district: json["district"],
      roomType: json["room_type"],
      status: json["status"] ?? "available",
      locked: json["locked"] ?? false,
      imageUrls: urls,
    );
  }
}