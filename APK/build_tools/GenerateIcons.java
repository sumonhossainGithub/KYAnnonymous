import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

public class GenerateIcons {
    public static void main(String[] args) throws Exception {
        String baseDir = args.length > 0 ? args[0] : ".";
        int[] sizes = {48, 72, 96, 144, 192, 512};
        String[] dirs = {
            "src/res/mipmap-mdpi/ic_launcher.png",
            "src/res/mipmap-hdpi/ic_launcher.png",
            "src/res/mipmap-xhdpi/ic_launcher.png",
            "src/res/mipmap-xxhdpi/ic_launcher.png",
            "src/res/mipmap-xxxhdpi/ic_launcher.png",
            "ic_launcher_512.png"
        };

        for (int i = 0; i < sizes.length; i++) {
            int size = sizes[i];
            BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = img.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            double scale = size / 512.0;

            // Background circle with gradient
            Paint bgGrad = new GradientPaint(
                0, 0, new Color(7, 26, 22),
                size, size, new Color(3, 12, 14)
            );
            g.setPaint(bgGrad);
            g.fill(new RoundRectangle2D.Double(scale * 16, scale * 16, size - scale * 32, size - scale * 32, scale * 110, scale * 110));

            // Glowing border
            g.setStroke(new BasicStroke((float)(scale * 10)));
            g.setColor(new Color(16, 185, 129, 210)); // Emerald #10b981
            g.draw(new RoundRectangle2D.Double(scale * 16, scale * 16, size - scale * 32, size - scale * 32, scale * 110, scale * 110));

            // Inner subtle ring
            g.setStroke(new BasicStroke((float)(scale * 2)));
            g.setColor(new Color(6, 182, 212, 120)); // Cyan #06b6d4
            g.draw(new RoundRectangle2D.Double(scale * 28, scale * 28, size - scale * 56, size - scale * 56, scale * 95, scale * 95));

            // Ghost Mascot Body
            GeneralPath ghost = new GeneralPath();
            double gx = scale * 156;
            double gy = scale * 120;
            double gw = scale * 200;
            double gh = scale * 230;

            // Ghost head (half circle)
            ghost.moveTo(gx, gy + gh * 0.45);
            ghost.curveTo(gx, gy, gx + gw, gy, gx + gw, gy + gh * 0.45);
            // Right edge down
            ghost.lineTo(gx + gw, gy + gh * 0.85);
            // Wavy bottom tentacles
            ghost.curveTo(gx + gw * 0.88, gy + gh * 0.72, gx + gw * 0.75, gy + gh * 0.95, gx + gw * 0.66, gy + gh * 0.82);
            ghost.curveTo(gx + gw * 0.55, gy + gh * 0.72, gx + gw * 0.45, gy + gh * 0.95, gx + gw * 0.33, gy + gh * 0.82);
            ghost.curveTo(gx + gw * 0.22, gy + gh * 0.72, gx + gw * 0.12, gy + gh * 0.95, gx, gy + gh * 0.85);
            ghost.closePath();

            // Fill Ghost body with clean white/emerald glow
            Paint ghostGrad = new GradientPaint(
                (float)(gx + gw/2), (float)gy, new Color(245, 255, 250),
                (float)(gx + gw/2), (float)(gy + gh), new Color(167, 243, 208)
            );
            g.setPaint(ghostGrad);
            g.fill(ghost);

            // Ghost Eyes (cute dark oval eyes)
            g.setColor(new Color(7, 25, 22));
            g.fill(new Ellipse2D.Double(scale * 210, scale * 200, scale * 24, scale * 34));
            g.fill(new Ellipse2D.Double(scale * 278, scale * 200, scale * 24, scale * 34));

            // Eye highlights (white sparkle in eyes)
            g.setColor(Color.WHITE);
            g.fill(new Ellipse2D.Double(scale * 214, scale * 204, scale * 8, scale * 10));
            g.fill(new Ellipse2D.Double(scale * 282, scale * 204, scale * 8, scale * 10));

            // Cute small smile
            g.setStroke(new BasicStroke((float)(scale * 6), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.setColor(new Color(7, 25, 22));
            Arc2D.Double smile = new Arc2D.Double(scale * 236, scale * 235, scale * 40, scale * 26, 200, 140, Arc2D.OPEN);
            g.draw(smile);

            // "KY" text badge at bottom
            g.setFont(new Font("SansSerif", Font.BOLD, (int)(scale * 62)));
            String badge = "KY";
            FontMetrics fm = g.getFontMetrics();
            int tw = fm.stringWidth(badge);
            int tx = (size - tw) / 2;
            int ty = (int)(scale * 435);

            // Badge pill background
            g.setColor(new Color(3, 12, 14, 230));
            g.fill(new RoundRectangle2D.Double(tx - scale * 18, ty - fm.getAscent() - scale * 2, tw + scale * 36, fm.getHeight() + scale * 4, scale * 20, scale * 20));
            g.setStroke(new BasicStroke((float)(scale * 3)));
            g.setColor(new Color(16, 185, 129, 200));
            g.draw(new RoundRectangle2D.Double(tx - scale * 18, ty - fm.getAscent() - scale * 2, tw + scale * 36, fm.getHeight() + scale * 4, scale * 20, scale * 20));

            // Text
            g.setColor(new Color(52, 211, 153)); // Emerald #34d399
            g.drawString(badge, tx, ty);

            g.dispose();

            File outFile = new File(baseDir + "/" + dirs[i]);
            outFile.getParentFile().mkdirs();
            ImageIO.write(img, "png", outFile);
        }
        System.out.println("All icons successfully generated!");
    }
}